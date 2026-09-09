import type { Request, Response } from 'express';
import type { AiClient } from '../ai.js';
import { logger } from '../config.js';
import { AppError } from '../http.js';
import { readSource, withoutDescriptions, type SourceDocument, type UploadedFile } from '../ingest.js';
import { getRepository, type BusinessRepository } from '../store.js';
import { answerQuestion } from './askAbout.js';
import { readBudgetTap } from './budget.js';
import { askWhichTrade, rememberTrade, routeTrade } from './routeTrade.js';
import { findPictures, PICTURES_LINE } from './pictures.js';
import { asObject, chatError } from './errors.js';
import { specOf } from './fieldSpec.js';
import { TRADE_PRICING } from './pricing/spec.js';
import { TRADE_WORDS } from '../messages.js';
import { loadTradeSchema, makeLabelFor, optionsFor, type TradeSchema } from './schema.js';
import { assertWithinDailyBudget, recordSpend } from './spend.js';
import { runTurn, SAID_NOTHING } from './agent.js';
import { readAttachmentFacts } from './attachmentFacts.js';
import { formatFencingResult } from './formatResult.js';
import { matchBusinesses } from './matcher.js';
import { mergeAndDecide } from './mergeAndDecide.js';
import { resolveSuburb } from './suburb.js';
import { priceAndRank } from './priceAndRank.js';
import { saveChatResult } from './saveResult.js';
import type { Answer, ChatBody, ChatResponse, Checklist, Place, TurnExtraction, UiState } from './schemas.js';
import type { ChecklistField } from './vocab.js';

/** A keyed list resolves against a value the customer has already given, and only a string is one. */
const asText = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);

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

/**
 * A file we got nothing out of, said out loud.
 *
 * The business side has always done this - "We could not read anything from X" - and the customer
 * side never did: `readSource` sets `unreadable` on a document it could not transcribe, and this
 * function is the first thing on this side of the product to read that flag.
 *
 * It matters most for the trade that came second. A fencing customer attaches a quote, which is
 * text and transcribes fine. A tiling customer attaches PHOTOGRAPHS OF A BATHROOM, and the
 * transcription prompt's whole job is copying out text a photo does not have - so the transcript
 * comes back empty, and until now the turn simply carried on as though nothing had been sent. They
 * uploaded three pictures, watched them upload, and were asked the next question as if they had
 * not. Whatever is eventually decided about reading photographs properly, saying nothing was the
 * one answer that was never defensible.
 */
function unreadableNotice(documents: SourceDocument[]): string {
  const unread = documents.filter((doc) => doc.unreadable).map((doc) => doc.label);
  if (!unread.length) return '';

  const named =
    unread.length === 1
      ? unread[0]
      : unread.length === 2
        ? `${unread[0]} or ${unread[1]}`
        : `${unread.slice(0, -1).join(', ')} or ${unread[unread.length - 1]}`;

  /* Names the file, because "your attachment" is no help to somebody who sent four. Says what to do
     instead, because a photo of a room genuinely has nothing written on it and sending it again
     will do exactly the same thing. */
  return `I could not read anything from ${named} — if there are figures on it, type them in or send a clearer photo.`;
}

/**
 * How many of the customer's own questions one conversation may have searched for.
 *
 * The daily spend ceiling is the wrong instrument here on its own: `chatLimiter` allows forty
 * messages a minute on one session, and at roughly seven cents a rates question that is over a
 * dollar a minute from a single browser tab. Six is far past what anybody genuinely asks while
 * booking a fence, and past it the question is simply not looked up - the next checklist question
 * is asked exactly as it was before any of this existed.
 */
const MAX_ANSWERS = 6;

/**
 * The search, but only when there is something to search for and budget left to do it with.
 *
 * Deliberately not inside `askAbout.ts`: that file answers a question, this decides whether we are
 * answering one at all, and that decision belongs beside the rest of the turn's control flow.
 */
async function answerIfAsked(
  parsed: TurnExtraction,
  known: Partial<Checklist>,
  ui: UiState | null,
  schema: TradeSchema,
  repo: BusinessRepository,
): Promise<Answer | null> {
  /* Two halves, each with its own entry condition, because each needs different things reported.
     Words need the question and the kind of answer it wants; pictures need only the subject - so a
     turn that named what to show but did not think to also copy the sentence out ("show me
     colorbond") still gets its photographs, rather than nothing at all on the strength of a field
     it did not need. */
  const showing = parsed.pictureOf?.trim() ?? '';
  const asking = parsed.askedKind && parsed.askedAbout?.trim() ? parsed.askedAbout.trim() : '';
  if (!showing && !asking) return null;
  if ((ui?.answers ?? 0) >= MAX_ANSWERS) return null;

  const place = ui?.place ?? null;
  /* What was on screen when they asked, in the words they saw. `__other__` opens a text box rather
     than naming a fence, so it is not one of the things they can be pointing at. */
  const labelFor = makeLabelFor(schema);
  const choices = (ui?.lastValues ?? [])
    .map(String)
    .filter((value) => value !== '__other__')
    .map((value) => (ui?.lastAsked ? labelFor(ui.lastAsked, value) : value));

  /* And the whole list those three came off, which is a different thing and is why this is here:
     the page on screen is what "which of these" points at, but "I have a farmhouse" is a question
     about everything we publish - and answered off the page alone it produced advice about pool
     fencing. Keyed lists (fencing heights are keyed by material) resolve against what they have
     already chosen; before that choice there is genuinely nothing to list. */
  const spec = ui?.lastAsked ? specOf(schema.fields, ui.lastAsked) : undefined;
  const everything = spec
    ? optionsFor(schema, spec, spec.optionsKeyedBy ? asText(known[spec.optionsKeyedBy]) : null).map((value) =>
        labelFor(spec.key as ChecklistField, String(value)),
      )
    : [];

  /* What they have already chosen, whichever field that is for this trade - the fence, or the tile.
     It fills in for "it" when they ask "what does it look like" three questions later. */
  const headline = TRADE_PRICING[schema.trade].headlineField;
  const material = typeof known[headline] === 'string' ? (known[headline] as string) : null;
  const context = {
    trade: schema.trade,
    suburb: typeof known.suburb === 'string' ? known.suburb : (place?.suburb ?? null),
    state: place?.state ?? null,
    material,
    asked: ui?.lastQuestion || null,
    choices,
    everything,
    /* The same conversation memory the chat agent reads. Without it a follow-up - "and how does
       that one go in a wet area" - is looked up as though it were the first thing anybody had
       said. */
    history: ui?.history ?? [],
  };

  /* Being shown and being told are two different things they can ask for, and one message asks for
     both all the time: "which is better, treated pine or colorbond - and show me pictures of both".
     Read as one kind that came back as advice and the pictures were dropped, which is exactly what
     a customer notices. So they are two questions here, asked at once rather than one after the
     other - the pictures land on the same turn as the words, and cost it no extra time.

     Only what they asked to SEE goes to the image search, never the whole sentence: that message
     handed to Google is thirty words of context around the two that matter. The fence they have
     already chosen fills in for "it"; the label rather than the slug, because "Treated pine" is
     what Google knows and `timber_pine` is ours. */
  const [images, written] = await Promise.all([
    showing ? findPictures(showing, material ? labelFor(headline, material) : null, TRADE_WORDS[schema.trade], repo) : [],
    /* No words asked for, none written: a cent and three seconds for a paragraph nobody wanted.
       Which half runs is now each field's own business, so neither can cancel the other. */
    asking && parsed.askedKind ? answerQuestion({ question: asking, kind: parsed.askedKind }, context, { repo }) : null,
  ]);

  if (written) return images.length ? { ...written, images } : written;
  if (images.length) return { text: PICTURES_LINE, sources: [], images, kind: 'looks' };

  /* Asked to be shown and there was nothing to show - no key, a search outage, or every result
     filtered out as a logo. Words are a worse answer than pictures and a far better one than
     pretending the question was never asked. */
  return showing ? answerQuestion({ question: asking || showing, kind: 'advice' }, context, { repo }) : null;
}

export interface FencingChatDeps {
  ai?: AiClient;
  repo?: BusinessRepository;
}

/**
 * The testable core: everything the route handler does, minus Express. Tests drive a full
 * conversation by calling this directly turn after turn, feeding each response's `checklist`
 * straight back in as the next turn's `knownChecklist` - exactly what the real client does.
 */
export async function runChat(input: ChatBody, files: UploadedFile[] = [], deps: FencingChatDeps = {}): Promise<ChatResponse> {
  const repo = deps.repo ?? getRepository();

  const place = asObject<Place>(input.place);
  const known = asObject<Partial<Checklist>>(input.knownChecklist) ?? {};
  const ui: UiState | null = known._ui ?? null;

  // The trade's whole vocabulary, from Firestore `schema/fencing`. Read once per conversation
  // (process-cached, 5-minute TTL) rather than per turn - this is what makes the chat pick up a
  // business-side vocabulary change without a redeploy, and what will make a second trade a new
  // document rather than a new code path.
  /* WHICH TRADE, before anything else in the turn, because the schema, the model's briefing and
     every question after this depend on it.

     The caller may say and wins when it does. Otherwise this conversation's own earlier answer
     stands. Otherwise the customer's own words decide it - most people say "I need a fence quote"
     or "after a price for tiling my bathroom" in their opening sentence, and asking them a question
     they have already answered is the fastest way to look like nobody is listening. Only when all
     three are silent, or when one message names both trades, is the question asked. */
  const published = await repo.listPublishedTrades();
  /* `input.message` rather than the budget-stripped `message` below, which is not computed yet -
     and it makes no difference: a budget chip only exists mid-conversation, by which point the
     trade was settled on the first turn and comes back from the session. */
  const routing = routeTrade(input.message, input.trade, ui?.trade, published);

  if (!routing.trade) {
    logger.info({ requestId: input.sessionId, ambiguous: routing.ambiguous }, 'asking which trade');
    return askWhichTrade(input.sessionId, published, known, routing.ambiguous);
  }

  const trade = routing.trade;
  if (routing.by === 'keywords') logger.info({ requestId: input.sessionId, trade }, 'trade read from the message');
  const schema = await loadTradeSchema(trade, repo);

  /* Attachments only - the chat message itself never enters this transcript, kept separate exactly
     as it is in the source system.

     Read AFTER the trade is settled, because what a document is worth reading for is the trade's
     own business: a height and a run on a fencing quote, a room and an area on a tiling one. It
     used to run first and read every document as though it were a fence quote.

     A turn that could not settle the trade has already returned above, so a customer being asked
     "fencing or tiling?" no longer pays for a transcription that was thrown away unread. */
  /* `describe: true` - a customer photographs the room, not a price list, and a photo that comes
     back empty tells this turn that nothing was sent. What comes back described reaches the model
     and stops there; `readAttachmentFacts` refuses to read it, on purpose. */
  const source = files.length
    ? await readSource('', files, { describe: true })
    : { text: '', documents: [] };
  const extractedText = source.text.slice(0, 4000);
  /* The whole transcript, headers and all, and without the model's 4,000-character budget: the
     reader tells the documents apart BY those headers, and being regular expressions, length costs
     it nothing. The model's budget is about tokens and stays where it is. */
  const { docFacts, docSuburbHint } = readAttachmentFacts(source.text, schema);

  /* A guide figure tapped off a rates answer. It is not an answer to anything we asked, so the
     rest of the turn must not see it: the message is emptied out, which leaves the question on
     screen asked again with its own choices intact. Left in place it would be read as the answer
     to whatever was on screen - taps are resolved against `ui.lastAsked` in code, and "budget:75-
     120:hipages" would have become somebody's fence type. */
  const budget = readBudgetTap(input.message);
  const message = budget ? '' : input.message;

  /* A tapped option needs no model at all.
     The value came from a list this code generated last turn, so this code already knows exactly
     what it means - `mergeAndDecide` resolves it against `ui.lastAsked` without help. Calling the
     model to be told what we already know costs three seconds of the customer staring at a
     spinner, and money, on what is by far the commonest turn in the conversation. Free text still
     goes to the model, because that genuinely needs reading. */
  const tapped =
    !!budget ||
    (!files.length &&
      !!ui?.lastValues?.length &&
      ui.lastValues.some((value) => String(value) === message.trim()) &&
      message.trim() !== '__other__');

  let turnResult;
  if (tapped) {
    turnResult = { data: SAID_NOTHING, usage: null };
  } else {
    await assertWithinDailyBudget(repo);
    turnResult = await runTurn(
      { message, extractedText, docFacts, docSuburbHint, known, ui },
      trade,
      { ai: deps.ai },
    );
    await recordSpend(turnResult.usage.costUsd, repo);
  }

  /* The suburb, resolved from words rather than from a picker, and the answer to anything they
     asked - both here rather than inside `mergeAndDecide` because both reach outside the process
     and that function is pure, which is what lets the golden conversations drive it turn after
     turn with nothing to stub. A place the browser sent still wins; the suburb lookup only answers
     when nobody has answered yet.

     Together rather than one after the other: they are a Google round trip and a web search, they
     need nothing from each other, and run in sequence they would add their two waits together on
     the one turn where a customer is already waiting longest. */
  const [resolved, answer] = await Promise.all([
    resolveSuburb({
      place,
      ui,
      message,
      suggestedSuburb: turnResult.data.suggestedSuburb || docSuburbHint || ui?.suburbHint || null,
    }),
    answerIfAsked(turnResult.data, known, ui, schema, repo),
  ]);

  const state = mergeAndDecide({
    sessionId: input.sessionId,
    message,
    place: place ?? resolved.place,
    suburbChoices: resolved.choices,
    known,
    turnExtraction: turnResult.data,
    docFacts,
    docSuburbHint,
    /* Descriptions excluded, deliberately. This is the text `mentioned()` checks a model's claim
       against - "did the customer actually write this?" - and a description is text the MODEL
       wrote. Left in, it lets the model hand itself its own sentence as proof of its own claim.
       The model still SEES the description; it just cannot cite it. */
    haystackText: message + ' ' + withoutDescriptions(extractedText),
    schema,
  });

  // The checklist's suburb is a display string derived from the confirmed place; the matcher uses it
  // only to widen its excluded-area comparison, so anything that is not text is simply not there.
  const suburb = typeof state.checklist.suburb === 'string' ? state.checklist.suburb : null;
  /* Timed because this is the one step whose cost grows with the number of businesses: a service
     document is read per candidate. The per-request and per-model-call logs already cover
     everything else, so request ms minus model ms minus this is Firestore and cold start. */
  const matchStarted = Date.now();
  const matcher = state.needsMatcher ? await matchBusinesses(trade, state.place, suburb, repo) : null;
  if (state.needsMatcher) {
    logger.info(
      { requestId: input.sessionId, ms: Date.now() - matchStarted, candidates: matcher?.diagnostics.candidates ?? 0, matched: matcher?.totalCovering ?? 0 },
      'matcher',
    );
  }

  const formatted = formatFencingResult({ state, matcher, answer, budget, tapped });
  const response = matcher?.matched ? priceAndRank(formatted, matcher, schema) : formatted;

  /* In front of whatever the turn was going to say, the same way an answer to their own question
     goes in front of it: the question still gets asked, they just find out first that one of their
     files told us nothing. */
  const notice = unreadableNotice(source.documents);
  const spoken = notice ? { ...response, message: `${notice} ${response.message}`.trim() } : response;

  /* Settled once, and carried in the state the client echoes back. Re-deciding every turn would let
     "the old fence is coming out" three questions into a tiling job re-route the conversation and
     throw away everything already answered - and relying on the caller to keep sending it would
     fail silently into fencing the first time one forgot. */
  return rememberTrade(spoken, trade);
}

/**
 * What the customer can be offered, for a frontend building a trade picker.
 *
 * Read from what is PUBLISHED rather than from the compiled `TRADES`, so a trade the code can serve
 * but nobody has onboarded into yet is never put on screen - offering it would match nobody.
 *
 * Deliberately a list rather than a question in the chat. Asking "which trade?" when a request does
 * not name one would change the answer for every client that has never sent one, including the
 * deployed frontend and every golden conversation, all of which correctly get fencing today. Which
 * trade a customer is in is the entry point's decision, and this is what that decision reads.
 */
export async function clientTrades(_req: Request, res: Response): Promise<void> {
  const repo = getRepository();
  const trades = await repo.listPublishedTrades();
  res.status(200).json({
    ok: true,
    data: trades.map((trade) => ({ trade, label: TRADE_WORDS[trade].trade })),
  });
}

/**
 * Every failure a turn can produce leaves here in the chat's own shape, never the `{ ok, error }`
 * envelope the rest of the API uses - see `errors.ts` for why.
 */
export async function clientChat(req: Request, res: Response): Promise<void> {
  try {
    const response = await runChat(req.body as ChatBody, filesOf(req));
    /* Written from the route rather than from the pipeline: persistence is a transport concern, and
       keeping it out means `runChat` stays a pure function of its input - which is what lets
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
