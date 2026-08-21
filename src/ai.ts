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
}

export interface StageUsage {
  name: string;
  ms: number;
  tokensIn: number;
  tokensOut: number;
  retries: number;
  costUsd: number;
}

export interface ModelResult<T> {
  data: T;
  usage: StageUsage;
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
  mock: { in: 0, out: 0 },
};

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
 * The single chokepoint. Nothing else in this codebase imports the OpenAI SDK — one file to audit
 * for key handling, one place that counts tokens, one place that retries.
 */
class OpenAiClient implements AiClient {
  readonly model: string;
  private readonly sdk: OpenAI;
  /**
   * Sampling off, so the same submission gives the same answer twice. Some models refuse the
   * parameter outright; the first 400 that says so flips this and we stop sending it, rather than
   * failing a real request over a knob.
   */
  private sendTemperature = true;

  constructor(apiKey: string, model: string) {
    this.model = model;
    this.sdk = new OpenAI({ apiKey, maxRetries: 0 }); // retries are ours, below, and counted
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
          costUsd: costUsd(this.model, tokensIn, tokensOut),
        };
        logger.info({ stage: call.name, ...usage }, 'model call');
        return { data: parsed.value, usage };
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

  private async request(
    call: ModelCall<unknown>,
    feedback: string,
  ): Promise<{ text: string; tokensIn: number; tokensOut: number }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), call.timeoutMs ?? env.MODEL_TIMEOUT_MS);

    try {
      const response = await this.sdk.responses.create(
        {
          model: this.model,
          instructions: call.system + feedback,
          input: buildInput(call),
          max_output_tokens: call.maxOutputTokens,
          ...(this.sendTemperature ? { temperature: 0 } : {}),
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
      };
    } catch (err) {
      if (this.sendTemperature && isUnsupportedTemperature(err)) {
        logger.warn({ model: this.model }, 'model does not accept temperature; continuing without it');
        this.sendTemperature = false;
        clearTimeout(timer);
        return this.request(call, feedback);
      }
      throw toUpstreamError(err);
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
  if (status === 429) return new AppError(429, 'The model is rate limiting us, try again shortly', 'rate_limited');

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
        fixes: [
          {
            kind: 'missing',
            what: 'Send your fencing details with the fence types, heights and per-metre prices you charge.',
            example: 'Timber 1.8m - $110/m (your figure)',
          },
        ],
      };
    }
    return {
      outcome: fixes.length === 0 ? 'approved' : 'needs_updates',
      fixes: fixes.slice(0, 5),
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
