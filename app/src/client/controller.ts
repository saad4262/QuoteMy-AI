import type { Request, Response } from 'express';
import type { AiClient } from '../ai.js';
import { logger } from '../config.js';
import { AppError } from '../http.js';
import { readSource, type UploadedFile } from '../ingest.js';
import { getRepository, type BusinessRepository } from '../store.js';
import { asObject, chatError } from './errors.js';
import { loadTradeSchema } from './schema.js';
import { assertWithinDailyBudget, recordSpend } from './spend.js';
import { runTurn, SAID_NOTHING } from './agent.js';
import { readAttachmentFacts } from './attachmentFacts.js';
import { formatFencingResult } from './formatResult.js';
import { matchBusinesses } from './matcher.js';
import { mergeAndDecide } from './mergeAndDecide.js';
import { resolveSuburb } from './suburb.js';
import { priceAndRank } from './priceAndRank.js';
import { saveChatResult } from './saveResult.js';
import type { ChatBody, ChatResponse, Checklist, Place, UiState } from './schemas.js';

/**
 * One route, one handler - same principle as the business side's `POST /business`. Unlike that
 * route, there's no `action` switch: every request is one turn of the same conversation.
 *
 * Orchestrates the pipeline ported from n8n's `chat_router.json` -> `quote - fence
 * subworkflow.json`: attachment extraction -> deterministic fact reading -> the model's one-field
 * turn read -> merge/validate -> (match + price, only once the brief is confirmed) -> the
 * customer-facing reply. No step's next step is ever chosen by a model - see `CONTEXT.md` §1.
 */

const filesOf = (req: Request): UploadedFile[] => (Array.isArray(req.files) ? req.files : []);

export interface FencingChatDeps {
  ai?: AiClient;
  repo?: BusinessRepository;
}

/**
 * The testable core: everything the route handler does, minus Express. Tests drive a full
 * conversation by calling this directly turn after turn, feeding each response's `checklist`
 * straight back in as the next turn's `knownChecklist` - exactly what the real client does.
 */
export async function runFencingChat(input: ChatBody, files: UploadedFile[] = [], deps: FencingChatDeps = {}): Promise<ChatResponse> {
  const repo = deps.repo ?? getRepository();

  const place = asObject<Place>(input.place);
  const known = asObject<Partial<Checklist>>(input.knownChecklist) ?? {};
  const ui: UiState | null = known._ui ?? null;

  // Attachments only - the chat message itself never enters this transcript, kept separate
  // exactly as it is in the source system.
  const source = files.length ? await readSource('', files) : { text: '', documents: [] };
  const extractedText = source.text.slice(0, 4000);
  // More than one attachment: a height off one document and a total off another describe a job
  // nobody priced, so the deterministic reader steps back and leaves it to the model instead.
  const multipleDocuments = files.length > 1;
  const { docFacts, docSuburbHint } = readAttachmentFacts(extractedText, multipleDocuments);

  // The trade's whole vocabulary, from Firestore `schema/fencing`. Read once per conversation
  // (process-cached, 5-minute TTL) rather than per turn - this is what makes the chat pick up a
  // business-side vocabulary change without a redeploy, and what will make a second trade a new
  // document rather than a new code path.
  const schema = await loadTradeSchema('fencing', repo);

  /* A tapped option needs no model at all.
     The value came from a list this code generated last turn, so this code already knows exactly
     what it means - `mergeAndDecide` resolves it against `ui.lastAsked` without help. Calling the
     model to be told what we already know costs three seconds of the customer staring at a
     spinner, and money, on what is by far the commonest turn in the conversation. Free text still
     goes to the model, because that genuinely needs reading. */
  const tapped =
    !files.length &&
    !!ui?.lastValues?.length &&
    ui.lastValues.some((value) => String(value) === input.message.trim()) &&
    input.message.trim() !== '__other__';

  let turnResult;
  if (tapped) {
    turnResult = { data: SAID_NOTHING, usage: null };
  } else {
    await assertWithinDailyBudget(repo);
    turnResult = await runTurn(
      { message: input.message, extractedText, docFacts, docSuburbHint, known, ui },
      { ai: deps.ai },
    );
    await recordSpend(turnResult.usage.costUsd, repo);
  }

  /* The suburb, resolved from words rather than from a picker.
     Done here rather than inside `mergeAndDecide` because it needs Google and that function is
     pure - the golden conversations drive it turn after turn with nothing to stub. A place the
     browser sent still wins; this only answers when nobody has answered yet. */
  const resolved = await resolveSuburb({
    place,
    ui,
    message: input.message,
    suggestedSuburb: turnResult.data.suggestedSuburb || docSuburbHint || ui?.suburbHint || null,
  });

  const state = mergeAndDecide({
    sessionId: input.sessionId,
    message: input.message,
    place: place ?? resolved.place,
    suburbChoices: resolved.choices,
    known,
    turnExtraction: turnResult.data,
    docFacts,
    docSuburbHint,
    haystackText: input.message + ' ' + extractedText,
    schema,
  });

  // The checklist's suburb is a display string derived from the confirmed place; the matcher uses it
  // only to widen its excluded-area comparison, so anything that is not text is simply not there.
  const suburb = typeof state.checklist.suburb === 'string' ? state.checklist.suburb : null;
  /* Timed because this is the one step whose cost grows with the number of businesses: a service
     document is read per candidate. The per-request and per-model-call logs already cover
     everything else, so request ms minus model ms minus this is Firestore and cold start. */
  const matchStarted = Date.now();
  const matcher = state.needsMatcher ? await matchBusinesses('fencing', state.place, suburb, repo) : null;
  if (state.needsMatcher) {
    logger.info(
      { requestId: input.sessionId, ms: Date.now() - matchStarted, candidates: matcher?.diagnostics.candidates ?? 0, matched: matcher?.totalCovering ?? 0 },
      'matcher',
    );
  }

  const formatted = formatFencingResult({ state, matcher });
  return matcher?.matched ? priceAndRank(formatted, matcher, schema) : formatted;
}

/**
 * Every failure a turn can produce leaves here in the chat's own shape, never the `{ ok, error }`
 * envelope the rest of the API uses - see `errors.ts` for why.
 */
export async function fencingChat(req: Request, res: Response): Promise<void> {
  try {
    const response = await runFencingChat(req.body as ChatBody, filesOf(req));
    /* Written from the route rather than from the pipeline: persistence is a transport concern, and
       keeping it out means `runFencingChat` stays a pure function of its input - which is what lets
       the golden conversations drive it turn after turn with nothing to clean up in between. */
    const resultId = await saveChatResult(response);
    res.status(200).json(resultId ? { ...response, resultId } : response);
  } catch (err) {
    const known = err instanceof AppError;
    const status = known ? err.status : 500;
    if (!known || status >= 500) logger.error({ err, requestId: req.requestId }, 'chat turn failed');
    res.status(status).json(chatError(req, known ? err.code : 'internal_error'));
  }
}
