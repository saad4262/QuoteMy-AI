import OpenAI from 'openai';
import { z } from 'zod';
import { env, logger } from './config.js';
import { AppError } from './http.js';
import { toStrictJsonSchema } from './schemas.js';
import type { Material } from './vocab.js';

/** A file on its way to the model. Held in memory only — nothing is ever written to disk. */
export interface ModelFile {
  name: string;
  mime: string;
  data: Buffer;
  isImage: boolean;
}

export interface ModelCall<T> {
  /** Schema name sent to OpenAI, and the label this call appears under in `meta.stages`. */
  name: string;
  schema: z.ZodType<T>;
  system: string;
  user: string;
  files?: ModelFile[];
  maxOutputTokens: number;
  timeoutMs?: number;
  /** Overrides the client's default model for this one call - e.g. a cheap model for a small, low-stakes turn. */
  model?: string;
  /**
   * Built-in provider tools for this one call - today only `[{ type: 'web_search' }]`. Almost every
   * call has none: a model that can look something up is a model that can spend money and take
   * seconds doing it, so it is opt-in per call rather than a property of the client.
   */
  tools?: OpenAI.Responses.Tool[];
  /**
   * Ceiling on tool calls in one response. Each web search is billed per call, and left uncapped
   * the model happily runs three searches for one question - so this is a cost control, not a
   * correctness one.
   */
  maxToolCalls?: number;
}

export interface StageUsage {
  name: string;
  ms: number;
  tokensIn: number;
  tokensOut: number;
  retries: number;
  costUsd: number;
}

/** A page the provider says it actually opened while answering. */
export interface Citation {
  title: string;
  url: string;
}

export interface ModelResult<T> {
  data: T;
  usage: StageUsage;
  /**
   * Pages the provider cited, read from the reply's `url_citation` annotations rather than from
   * anything the model wrote. Only ever present on a call that had a search tool.
   *
   * Treat it as evidence, never as the list of sources: a search answer routinely names five sites
   * off the search results and annotates one of them. It is what we can prove was opened, which is
   * a smaller set than what was read.
   */
  citations?: Citation[];
  /**
   * How many searches the model actually ran. Billed per call and separately from tokens, so the
   * caller adds `searches * WEB_SEARCH_CALL_USD` to the spend - counted rather than assumed from
   * the cap, because the model routinely stops at one when two were allowed and a ledger that
   * charges for the ceiling trips the daily limit early.
   */
  searches?: number;
}

export interface AiClient {
  readonly model: string;
  callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>>;
}

/**
 * Per-1M-token prices, USD. Verified against OpenAI's docs on 2026-08-19 — never fill these in
 * from memory, and re-check before changing a model (CLAUDE.md).
 */
export const MODEL_PRICES: Record<string, { in: number; out: number }> = {
  'gpt-5.6-terra': { in: 2, out: 12 },
  'gpt-5.6-sol': { in: 5, out: 30 },
  'gpt-5.6-luna': { in: 0.2, out: 1.2 },
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4o-mini': { in: 0.15, out: 0.6 },
  mock: { in: 0, out: 0 },
};

/**
 * Charged per `web_search` call, USD. Verified on OpenAI's pricing page 2026-08-31 - never from
 * memory (CLAUDE.md).
 *
 * It is a flat fee, not tokens, so `costUsd` below cannot see it and the daily chat ceiling would
 * under-count every search we ever run. Whoever adds the tool to a call adds this to the spend.
 */
export const WEB_SEARCH_CALL_USD = 0.01;

export function costUsd(model: string, tokensIn: number, tokensOut: number): number {
  const p = MODEL_PRICES[model];
  if (!p) return 0;
  return Number(((tokensIn * p.in) / 1e6 + (tokensOut * p.out) / 1e6).toFixed(6));
}

/**
 * Without files this is just the prompt text. With files it becomes the Responses API's content
 * parts: PDFs, Word and spreadsheets as `input_file` (OpenAI pulls out the text layer AND the page
 * images), pictures as `input_image`. Both go as base64 data URLs, so nothing is uploaded first
 * and nothing outlives the request.
 */
function buildInput(call: ModelCall<unknown>): OpenAI.Responses.ResponseInput | string {
  if (!call.files?.length) return call.user;

  const parts: OpenAI.Responses.ResponseInputContent[] = [{ type: 'input_text', text: call.user }];

  for (const file of call.files) {
    const dataUrl = `data:${file.mime};base64,${file.data.toString('base64')}`;
    parts.push(
      file.isImage
        ? { type: 'input_image', image_url: dataUrl, detail: 'auto' }
        : { type: 'input_file', filename: file.name, file_data: dataUrl },
    );
  }

  return [{ role: 'user', content: parts }];
}

/**
 * The pages the reply cited, dug out of its `url_citation` annotations.
 *
 * Read defensively rather than by walking a known path: the annotation shape is the provider's, it
 * varies by tool, and a search answer whose citations we failed to read is still a usable answer.
 * Nothing here throws - the worst case is an empty list.
 */
function readCitations(response: OpenAI.Responses.Response): Citation[] {
  const found: Citation[] = [];
  const seen = new Set<string>();

  for (const item of response.output ?? []) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      const annotations = (part as { annotations?: unknown }).annotations;
      if (!Array.isArray(annotations)) continue;
      for (const raw of annotations) {
        const a = raw as { type?: string; title?: string; url?: string };
        if (a.type !== 'url_citation' || !a.url || seen.has(a.url)) continue;
        seen.add(a.url);
        found.push({ title: a.title ?? '', url: a.url });
      }
    }
  }
  return found;
}

/**
 * The single chokepoint. Nothing else in this codebase imports the OpenAI SDK — one file to audit
 * for key handling, one place that counts tokens, one place that retries.
 */
export class OpenAiClient implements AiClient {
  readonly model: string;
  private readonly sdk: OpenAI;
  /**
   * Sampling off, so the same submission gives the same answer twice. Some models refuse the
   * parameter outright; the first 400 that says so flips this and we stop sending it, rather than
   * failing a real request over a knob.
   */
  private sendTemperature = true;
  /** Tests set this to 0; nothing else should touch it. */
  retryWaitMs = 300;

  /** `sdk` is injectable so the retry loop can be driven in tests without reaching the network. */
  constructor(apiKey: string, model: string, sdk?: OpenAI) {
    this.model = model;
    this.sdk = sdk ?? new OpenAI({ apiKey, maxRetries: 0 }); // retries are ours, below, and counted
  }

  async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
    const started = Date.now();
    let tokensIn = 0;
    let tokensOut = 0;
    let retries = 0;
    let feedback = '';

    // Attempt 1 is the call. Attempt 2 is the ONE retry with the validation error fed back.
    // Two failures means the prompt is wrong — flag it, do not loop (CONTEXT.md §7.7).
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const raw = await this.request(call, feedback);
      tokensIn += raw.tokensIn;
      tokensOut += raw.tokensOut;

      const parsed = this.parse(call.schema, raw.text);
      if (parsed.ok) {
        const usage = {
          name: call.name,
          ms: Date.now() - started,
          tokensIn,
          tokensOut,
          retries,
          costUsd: costUsd(call.model ?? this.model, tokensIn, tokensOut),
        };
        logger.info({ stage: call.name, ...usage }, 'model call');
        return {
          data: parsed.value,
          usage,
          ...(raw.citations.length ? { citations: raw.citations } : {}),
          ...(raw.searches ? { searches: raw.searches } : {}),
        };
      }

      retries += 1;
      feedback = [
        '',
        'Your previous reply could not be used. It failed validation with:',
        parsed.error,
        'Return the same content again, corrected, matching the schema exactly.',
      ].join('\n');
      logger.warn({ stage: call.name, attempt, error: parsed.error }, 'model output failed validation');
    }

    throw new AppError(502, 'The model returned output we could not use', 'schema_violation');
  }

  /**
   * One call, with transient failures retried.
   *
   * The retry in `callStructured` above is a different thing: it answers a reply that arrived but
   * did not fit the schema. This one answers a reply that never arrived - a 500 from the provider,
   * a rate limit, a request that timed out. Those are the provider having a moment, and a customer
   * mid-conversation should not have to send their message again because of one.
   *
   * Bounded two ways, because the two failures cost very different amounts of time. A provider
   * that is down answers in milliseconds, so three attempts ~300ms and ~900ms apart cost nothing
   * and usually recover. A provider that HANGS costs the full timeout every attempt - three of
   * those on a chat turn is a customer watching a spinner for a minute - so the whole thing also
   * shares one deadline: once the call's own timeout has been spent, there is no retry left to
   * give, whatever the error was.
   */
  private async request(
    call: ModelCall<unknown>,
    feedback: string,
  ): Promise<{ text: string; tokensIn: number; tokensOut: number; citations: Citation[]; searches: number }> {
    const ATTEMPTS = 3;
    const deadline = Date.now() + (call.timeoutMs ?? env.MODEL_TIMEOUT_MS);

    for (let attempt = 1; ; attempt += 1) {
      try {
        return await this.attempt(call, feedback);
      } catch (err) {
        // Not a failure: this model refuses the parameter, so stop sending it and go again.
        if (this.sendTemperature && isUnsupportedTemperature(err)) {
          logger.warn({ model: call.model ?? this.model }, 'model does not accept temperature; continuing without it');
          this.sendTemperature = false;
          continue;
        }

        /* Jittered: without it every request that failed together retries together, and the
           provider is hit by exactly the same spike that throttled it in the first place. */
        const backoff = this.retryWaitMs * 3 ** (attempt - 1);
        const waitMs = Math.round(backoff * (0.5 + Math.random()));
        const spent = Date.now() + waitMs >= deadline;
        if (!isTransient(err) || attempt >= ATTEMPTS || spent) throw toUpstreamError(err);

        logger.warn(
          { stage: call.name, attempt, waitMs, status: (err as { status?: number })?.status },
          'model call failed, retrying',
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }

  private async attempt(
    call: ModelCall<unknown>,
    feedback: string,
  ): Promise<{ text: string; tokensIn: number; tokensOut: number; citations: Citation[]; searches: number }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), call.timeoutMs ?? env.MODEL_TIMEOUT_MS);

    try {
      const response = await this.sdk.responses.create(
        {
          model: call.model ?? this.model,
          instructions: call.system + feedback,
          input: buildInput(call),
          max_output_tokens: call.maxOutputTokens,
          ...(this.sendTemperature ? { temperature: 0 } : {}),
          ...(call.tools?.length ? { tools: call.tools } : {}),
          ...(call.maxToolCalls ? { max_tool_calls: call.maxToolCalls } : {}),
          text: {
            format: {
              type: 'json_schema',
              name: call.name,
              strict: true,
              schema: toStrictJsonSchema(call.schema as z.ZodType),
            },
          },
        },
        { signal: controller.signal },
      );

      return {
        text: response.output_text ?? '',
        tokensIn: response.usage?.input_tokens ?? 0,
        tokensOut: response.usage?.output_tokens ?? 0,
        citations: readCitations(response),
        searches: (response.output ?? []).filter((item) => item.type === 'web_search_call').length,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  private parse<T>(schema: z.ZodType<T>, text: string) {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false as const, error: 'the reply was not valid JSON' };
    }
    const result = schema.safeParse(json);
    return result.success
      ? { ok: true as const, value: result.data }
      : { ok: false as const, error: JSON.stringify(z.treeifyError(result.error)) };
  }
}

/**
 * Worth trying again: the provider is rate limiting us, having a server-side problem, or the
 * request timed out. A 4xx that is not 429 is our own request being wrong - retrying it just
 * fails again more slowly.
 */
export const isTransient = (err: unknown): boolean => {
  const name = (err as { name?: string })?.name;
  if (name === 'AbortError' || name === 'TimeoutError') return true;
  const status = (err as { status?: number })?.status;
  // Not every 429 is worth waiting out. An empty credit balance answers 429 too, and no amount of
  // retrying refills it - it just spends twelve seconds of a customer's time to fail identically.
  if (status === 429) return !isOutOfCredit(err);
  return typeof status === 'number' && status >= 500;
};

/**
 * The provider says 429 both for "you are going too fast" and for "your balance is empty", which
 * are opposite situations: one clears on its own in seconds, the other needs somebody to go and
 * pay a bill and will never clear by itself.
 */
const isOutOfCredit = (err: unknown): boolean => {
  const e = err as { error?: { type?: string; code?: string } };
  return e?.error?.type === 'insufficient_quota' || e?.error?.code === 'credit_balance_exhausted';
};

const isUnsupportedTemperature = (err: unknown): boolean => {
  const e = err as { status?: number; message?: string; param?: string };
  return e?.status === 400 && /temperature/i.test(`${e.message ?? ''} ${e.param ?? ''}`);
};

function toUpstreamError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  const name = (err as { name?: string })?.name;
  if (name === 'AbortError' || name === 'TimeoutError') {
    return new AppError(504, 'The model did not respond in time', 'upstream_timeout');
  }

  const status = (err as { status?: number })?.status;
  /* An empty balance is not a busy provider. Telling a customer "we're a bit busy, try again"
     when the account has no credit is a lie they will act on repeatedly, and the retry above
     would have burned twelve seconds proving it. This one needs an operator, not a customer. */
  if (isOutOfCredit(err)) {
    logger.error({ status }, 'OPENAI CREDIT BALANCE EXHAUSTED - add credits at platform.openai.com/settings/organization/billing');
    return new AppError(503, 'The AI provider account is out of credit', 'at_capacity');
  }

  // Our own limiter also answers 429, and the two mean opposite things: that one is the customer
  // going too fast, this one is us being throttled by the provider through no fault of theirs.
  // A shared code left the frontend unable to tell "slow down" from "we are busy, try again".
  if (status === 429) return new AppError(503, 'The model is rate limiting us, try again shortly', 'upstream_busy');

  // Never surface the provider's message verbatim — it can echo prompt content back to the caller.
  logger.error({ err }, 'model call failed');
  return new AppError(502, 'The model service is unavailable', 'upstream_unavailable');
}

let instance: AiClient | null = null;

/** Built lazily so tests, typecheck and the mock provider never need a key. */
export function getAiClient(): AiClient {
  if (instance) return instance;

  if (env.AI_PROVIDER === 'mock') {
    instance = new MockAiClient();
    return instance;
  }

  if (!env.OPENAI_API_KEY) {
    throw new AppError(500, 'OPENAI_API_KEY is not configured', 'internal_error');
  }
  instance = new OpenAiClient(env.OPENAI_API_KEY, env.OPENAI_MODEL);
  return instance;
}

/** Tests inject their own; nothing else should call this. */
export function setAiClient(client: AiClient | null): void {
  instance = client;
}

/**
 * A deterministic stand-in for the model, used when `AI_PROVIDER=mock`.
 *
 * It exists so the whole request/response cycle — routes, validation, verification, reports,
 * storage, status transitions — can be exercised in Postman and in tests without an API key and
 * without spending anything. It is a rule-based reader, not an intelligence: it recognises firm
 * `$N per metre` lines and little else, which is exactly enough to prove the plumbing.
 *
 * It is never a fallback for a real failure. Switching provider is an explicit env change, and
 * every response says `"model": "mock"` in `meta`.
 */

const MATERIAL_HINTS: [RegExp, Material][] = [
  [/merbau|hardwood|spotted gum|jarrah/i, 'timber_hardwood'],
  [/treated pine|pine paling|paling/i, 'timber_pine'],
  [/colorbond|steel/i, 'colorbond'],
  [/glass/i, 'pool_glass'],
  [/pool/i, 'pool_aluminium'],
  [/aluminium|slat/i, 'aluminium'],
  [/chainmesh|chain wire|chain link/i, 'chainmesh'],
  [/rural|post and wire|paddock/i, 'rural_wire'],
];

const RATE_LINE = /^(.*?)([0-9]+(?:\.[0-9]+)?)\s*m\b.*?\$\s*([0-9]+(?:\.[0-9]+)?)\s*(?:per\s*(?:linear\s*)?met|\/\s*m)/i;

interface MockRate {
  material: Material;
  heightM: number;
  pricePerMetre: number;
  sourceQuote: string;
}

function readRates(text: string): MockRate[] {
  const lines = text.split('\n');
  const out: MockRate[] = [];
  let heading: Material | null = null;

  for (const line of lines) {
    const headingMatch = MATERIAL_HINTS.find(([re]) => re.test(line));
    if (headingMatch && !/\$/.test(line)) heading = headingMatch[1];

    const m = RATE_LINE.exec(line.trim());
    if (!m) continue;

    const inline = MATERIAL_HINTS.find(([re]) => re.test(m[1] ?? ''));
    const material = inline ? inline[1] : heading;
    if (!material) continue;
    if (/from\s*\$|poa|call us|–|—\s*\$?\d+\s*-\s*\$/i.test(m[1] ?? '')) continue;

    out.push({
      material,
      heightM: Number(m[2]),
      pricePerMetre: Number(m[3]),
      sourceQuote: line.trim(),
    });
  }
  return out;
}

const sentenceWith = (text: string, re: RegExp): string | null =>
  text.split('\n').find((l) => re.test(l))?.trim() ?? null;

export class MockAiClient implements AiClient {
  readonly model = 'mock';

  async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
    const text = call.user;
    const rates = readRates(text);

    let data: unknown;
    if (call.name === 'transcribe') data = this.transcribe(call.files ?? []);
    else if (call.name === 'review') data = this.review(text, rates);
    else if (call.name === 'turn') data = this.turn(text);
    else if (call.name === 'answer') data = this.answer();
    else data = this.extraction(text, rates);

    const usage = {
      name: call.name,
      ms: 1,
      tokensIn: Math.ceil((call.system.length + text.length) / 3.6),
      tokensOut: 0,
      retries: 0,
      costUsd: 0,
    };
    return { data: call.schema.parse(data), usage };
  }

  /**
   * Offline stand-in for reading a document. It can only do the honest, trivial case: if the bytes
   * happen to be readable text, hand them back. A real PDF or photo comes back as [unreadable],
   * because pretending to have read one would put invented figures into the pipeline - the exact
   * failure this whole system is built to prevent.
   */
  private transcribe(files: ModelFile[]) {
    return {
      documents: files.map((file) => {
        const decoded = file.data.toString('utf8');
        const isText = !file.data.includes(0) && Buffer.from(decoded, 'utf8').equals(file.data);
        return isText
          ? { label: file.name, text: decoded.trim(), unreadable: false }
          : { label: file.name, text: '', unreadable: true };
      }),
    };
  }

  private review(text: string, rates: MockRate[]) {
    const hasGst = /gst/i.test(text);
    const hasMinimum = /minimum charge/i.test(text);
    const vague = /\bpoa\b|call (?:us|for pricing)|from \$\d/i.test(text);

    // The blocking checklist, as far as a regex can see it. Crude on purpose - the mock exists to
    // catch regressions in the pipeline, not to reproduce the model's judgement - but without it
    // the offline score cannot tell a complete submission from a thin one.
    const stated = (re: RegExp) => re.test(text);
    const missingChecklist: [RegExp, string][] = [
      [/gate/i, 'Add your gate prices - single and double separately, or say you do not fit gates.'],
      [/remov|pull down|cart away/i, 'Add what you charge per metre to take away an old fence.'],
      [/slope|sloped|rock|hand.dig|access/i, 'Say what you charge extra for sloped, rocky or restricted sites, or that you charge nothing.'],
      [/post[s]? (are|go)|hole diameter|rails? of|footing/i, 'Add how you build: post size, spacing, depth, hole diameter, footings, rails and capping.'],
      [/permit/i, 'Say who arranges and pays for council permits, and any fee.'],
      [/warrant/i, 'Add how long your workmanship is warranted for.'],
    ];

    const fixes: { kind: 'missing' | 'unclear'; what: string; example: string | null }[] = [];
    if (rates.length < 3) {
      fixes.push({
        kind: 'unclear',
        what: 'Give one set price per metre for each fence type and height you do - most of what you sent is written as a range or a "call us".',
        example: 'Colorbond 1.8m - $110/m (your figure)',
      });
    }
    if (!hasGst) fixes.push({ kind: 'missing', what: 'Say whether your prices include GST.', example: 'All prices include GST' });
    if (!hasMinimum) {
      fixes.push({
        kind: 'missing',
        what: 'Add the smallest job you will take on and what you charge for it.',
        example: 'Minimum charge $850',
      });
    }
    for (const [re, what] of missingChecklist) {
      if (!stated(re)) fixes.push({ kind: 'missing', what, example: null });
    }

    if (vague && rates.length >= 3) {
      fixes.push({
        kind: 'unclear',
        what: 'Replace the remaining "POA" and "from" figures on your per-metre rates with the price you actually charge.',
        example: null,
      });
    }

    // Rough stand-in for the real judgement: nothing that looks like a rate anywhere means there
    // was nothing to assess.
    const looksLikeAPriceList = rates.length > 0 || /\$\s*\d/.test(text);
    if (!looksLikeAPriceList) {
      return {
        outcome: 'not_a_price_list',
        alsoWorthAdding: [],
        fixes: [
          {
            kind: 'missing',
            what: 'Send your fencing details with the fence types, heights and per-metre prices you charge.',
            example: 'Timber 1.8m - $110/m (your figure)',
          },
        ],
      };
    }
    // A rough stand-in: the mock cannot judge what a profile is missing, so it names the two
    // things almost every thin submission lacks.
    const alsoWorthAdding: string[] = [];
    if (!/gate/i.test(text)) alsoWorthAdding.push('Add your gate prices - most fencing jobs include at least one.');
    if (!/remov|pull down|take away/i.test(text)) {
      alsoWorthAdding.push('Add what you charge to pull down and take away an old fence.');
    }

    return {
      outcome: fixes.length === 0 ? 'approved' : 'needs_updates',
      fixes: fixes.slice(0, 5),
      alsoWorthAdding,
    };
  }

  /**
   * Offline stand-in for one turn of the customer quote chat (`client/agent.ts`). `text` is the
   * full context `agent.ts` builds - the raw message first, then labelled sections - so this
   * pulls the raw message back out and answers naively for whichever field was last asked.
   *
   * It cannot read a sentence the way a real model can, so it only ever fills the ONE field the
   * conversation is currently asking about; `mergeAndDecide.ts`'s validation and its own
   * `mentioned()` guard do the rest, exactly as they would for a real reply. That is enough to
   * drive a full conversation through tapped multiple-choice options and typed one-word answers
   * offline, without an API key.
   */
  /**
   * The offline stand-in for a web-searched answer. Deliberately says nothing a customer could
   * mistake for research: there is no search behind it, and an answer that reads plausibly while
   * being invented is the exact failure this whole product is built to avoid.
   *
   * It exists so the plumbing either side of the search - the cap, the cache, the prefix onto the
   * message, the speech - can be driven end to end with no key and no network.
   */
  private answer() {
    return {
      text: 'I cannot look that up right now, but a fencer will be able to tell you when they quote.',
      sources: [],
    };
  }

  private turn(context: string) {
    const rawMessage = (context.split('\n\n')[0] ?? '').trim();
    const lastAskedMatch = context.match(/--- The question you asked last turn ---\nfield: (\w+)/);
    const lastAsked = lastAskedMatch?.[1] ?? null;

    const checklist: Record<string, unknown> = {
      material: null,
      heightKey: null,
      lengthMeters: null,
      removal: null,
      conditions: null,
      gateType: null,
      gateQty: null,
      existingPrice: null,
    };

    if (lastAsked && lastAsked in checklist) {
      if (lastAsked === 'lengthMeters' || lastAsked === 'gateQty') {
        const n = Number(rawMessage.replace(/[^\d.]/g, ''));
        if (Number.isFinite(n) && n > 0) checklist[lastAsked] = n;
      } else if (lastAsked === 'conditions') {
        checklist.conditions = /^\s*(none|nothing|no\b|nil)/i.test(rawMessage) ? [] : [rawMessage];
      } else if (rawMessage) {
        checklist[lastAsked] = rawMessage;
      }
    }

    return {
      ack: '',
      checklist,
      clearFields: [],
      suggestedSuburb: null,
      wantsMoreOptions: /\b(more|other|different)\b/i.test(rawMessage),
      confirmed: /^\s*(y|ya|yes|yep|yeah|correct|confirmed?)\b/i.test(rawMessage),
      // The offline reader cannot judge a subject, and guessing would fail real conversations
      // in tests for no benefit. Judging this is the real model's job.
      offTopic: false,
      /* Same reason, and one more: recognising a question here would put a searched aside into
         every golden conversation that contains a question mark, which is not what those
         snapshots are pinning. A test that wants an answer injects a client that returns one. */
      askedAbout: null,
      namedOffList: null,
      askedKind: null,
    };
  }

  private extraction(text: string, rates: MockRate[]) {
    const gstLine = sentenceWith(text, /gst/i);
    const minLine = sentenceWith(text, /minimum charge/i);
    const minMatch = minLine ? /\$\s*([0-9,]+)/.exec(minLine) : null;
    const radiusLine = sentenceWith(text, /\b\d+\s*km\b/i);
    const radiusMatch = radiusLine ? /(\d+)\s*km/i.exec(radiusLine) : null;

    return {
      businessName: text.split('\n')[0]?.split('\u2014')[0]?.trim() ?? null,
      gstIncluded: gstLine ? /include/i.test(gstLine) : null,
      gstSourceQuote: gstLine,
      serviceArea: {
        baseLocation: /based in ([A-Z][a-zA-Z ]+)/i.exec(text)?.[1]?.trim() ?? null,
        radiusKm: radiusMatch?.[1] ? Number(radiusMatch[1]) : null,
        radiusSourceQuote: radiusLine,
        excludedAreas: [],
      },
      minimumCharge: minMatch?.[1] ? Number(minMatch[1].replace(/,/g, '')) : null,
      minimumChargeSourceQuote: minLine,
      rates,
      removals: [],
      gates: [],
      siteConditions: [],
      specs: [],
      permits: { included: null, fee: null, sourceQuote: null },
      warranty: { years: null, text: null, sourceQuote: null },
      extras: [],
      inclusions: [],
      exclusions: [],
      tags: [],
      otherOfferings: [],
      couldNotUse: ['Read by the offline mock reader - gates, removals and surcharges are not extracted in mock mode.'],
    };
  }
}
