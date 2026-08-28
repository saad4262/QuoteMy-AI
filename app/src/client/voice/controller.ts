import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { env, logger } from '../../config.js';
import { AppError } from '../../http.js';
import { getRepository, type BusinessRepository } from '../../store.js';
import { asObject } from '../errors.js';
import { runFencingChat } from '../controller.js';
import { saveChatResult } from '../saveResult.js';
import type { ChatOption, ChatResponse, Checklist, Place, UiState } from '../schemas.js';
import { matchSpokenToOption } from './matchSpoken.js';
import { greetingFor, toSpeech } from './toSpeech.js';

/**
 * One turn of a spoken quote conversation.
 *
 * The speech agent does speech and nothing else: it transcribes what was said, sends it here, and
 * reads back exactly the words it gets. Every decision - which question comes next, which choices
 * exist, what the price is - is made by the same pipeline the text chat uses. There is one product
 * with two front doors, not two products.
 *
 * The thin part of this file is the point. If it grows a rule, that rule belongs upstream where the
 * text chat gets it too.
 */

/**
 * What the customer said - read from either shape Retell sends it in.
 *
 * A custom tool posts `{ name, call, args: { spokenText } }` by default, and the flat
 * `{ spokenText }` only when its "args only" switch is on. Reading one of those two was the most
 * expensive line in this file: every turn arrived empty, the pipeline was handed nothing, the
 * suburb question repeated for ever - and Retell's own call log showed the words being sent
 * correctly the whole time. Nothing errored anywhere. Accepting both is how that stays fixed no
 * matter which way the tool is configured.
 */
export const voiceTurnBody = z
  .object({
    spokenText: z.string().optional(),
    args: z.looseObject({ spokenText: z.string().optional() }).optional(),
    /** The nested shape carries the call, and with it the dynamic variables. */
    call: z
      .looseObject({ retell_llm_dynamic_variables: z.looseObject({ session_id: z.string().optional() }).optional() })
      .optional(),
  })
  .loose()
  .transform((body) => ({
    spokenText: body.args?.spokenText ?? body.spokenText ?? '',
    sessionId: body.call?.retell_llm_dynamic_variables?.session_id ?? null,
  }));

export interface VoiceTurnBody {
  spokenText: string;
  /** Only from the nested payload. A fallback for the query string, never the primary. */
  sessionId?: string | null;
}

export interface VoiceTurnResult {
  speakText: string;
  isDone: boolean;
  /** Present on the last turn: where the finished quote was written for the page to render. */
  resultId?: string;
}

/**
 * How much of a call is kept. Long enough for any real conversation about a fence, short enough
 * that a caller who leaves the line open cannot grow one Firestore document without limit.
 */
const MAX_TURNS = 60;

export interface VoiceDeps {
  repo?: BusinessRepository;
}

/** A new call. The id is generated here so nothing a caller sends becomes a document key. */
export const newVoiceSession = () => randomUUID();

/**
 * Which of the choices they ended up giving, in the words they were read out in.
 *
 * Read from the answer that landed rather than from what `matchSpokenToOption` recognised, because
 * those are not the same thing: "No, no." is not close enough to "No gates" for code to be sure of
 * it, the model read it correctly anyway, and the transcript still has to show which option that
 * was. Taking the stored value covers every route an answer can arrive by.
 *
 * A tap in the text chat leaves "Nothing tricky" in the transcript. Saying it should leave the same
 * thing, not "Nothing tricky, nothing at all mate."
 */
function choseFrom(offered: ChatOption[], asked: string | null, checklist: Checklist): string | null {
  if (!asked || !offered.length) return null;

  const answer = (checklist as Record<string, unknown>)[asked];
  if (answer === null || answer === undefined || answer === '') return null;

  // An empty list is how "none of these" is stored for a multi-select - the option said `none`.
  const values = Array.isArray(answer) ? (answer.length ? answer : ['none']) : [answer];
  const labels = values
    .map((value) => offered.find((option) => String(option.value) === String(value))?.label)
    .filter((label): label is string => !!label);

  return labels.length ? labels.join(', ') : null;
}

export async function runVoiceTurn(
  sessionId: string,
  input: VoiceTurnBody,
  deps: VoiceDeps = {},
): Promise<VoiceTurnResult> {
  const repo = deps.repo ?? getRepository();
  const session = await repo.readVoiceSession(sessionId);

  /* Said one of the choices they were just read? Then this code already knows what it means - the
     choices were generated here last turn - and the pipeline resolves it without the model. That is
     the three-second turn rather than the six-second one, and it is most of them. Anything else
     goes through as spoken, because reading a sentence is exactly what the model is for. */
  const spoken = input.spokenText.trim();
  const offered = (session?.options ?? []) as ChatOption[];
  const matched = session ? matchSpokenToOption(spoken, offered) : null;
  const message = matched === null ? spoken : String(matched);

  /* The field the last turn asked about, so what they just answered can be named. */
  const asked = ((session?.checklist as Checklist | undefined)?._ui as UiState | undefined)?.lastAsked ?? null;

  const response: ChatResponse = await runFencingChat(
    {
      message,
      sessionId,
      place: session?.place ? JSON.stringify(session.place) : '',
      knownChecklist: session?.checklist ? JSON.stringify(session.checklist) : '',
    },
    [],
    { repo },
  );

  const speakText = toSpeech(response);
  const previousTurns = session?.turns ?? [];

  /* A call runs to the quote. The recap is read back in full and agreed to out loud, because a
     caller who has answered eight questions by voice should not be handed a ninth to tap - and
     because they have heard every value before they say yes, which is what stops that yes from
     meaning nothing. The page still gets everything: `resultId` is what it opens. */
  const isDone = response.type === 'result';
  const resultId = isDone ? await saveChatResult(response, repo) : null;

  /* Stored whole, `_ui` included. Every field in it exists to stop a bug: without `place` the
     suburb question reopens, without `rejectedPlaces` an uncovered suburb loops for ever, without
     `lastValues` the no-model turn above stops working. Trimming it is how those come back.
     Written after the quote is saved, so the page finds the result id in the same read that tells
     it the call is over. */
  await repo.writeVoiceSession(sessionId, {
    checklist: response.checklist,
    place: response.place,
    options: response.options,
    /* Numbered, not positioned. `slice` below drops the oldest turns of a very long call, which
       shifts every index behind them - and a page that tracks "I have rendered the first N" then
       re-renders turns it already had, remounting the list on every reply. */
    turns: [
      ...previousTurns,
      { n: (previousTurns.at(-1)?.n ?? 0) + 1, said: spoken, spoke: speakText, wrote: response.message, chose: choseFrom(offered, asked, response.checklist) },
    ].slice(-MAX_TURNS),
    resultId: resultId ?? session?.resultId ?? null,
    type: response.type,
    checklistDisplay: response.checklistDisplay,
    checklistPending: response.checklistPending,
    updatedAt: new Date().toISOString(),
  });

  logger.info({ sessionId, matched: matched !== null, type: response.type, isDone }, 'voice turn');

  return { speakText, isDone, ...(resultId ? { resultId } : {}) };
}

/**
 * Every failure leaves here as something speakable with `isDone: false`, never as a status the
 * agent cannot read. A call that gets a 500 goes silent, and silence on a phone call is the one
 * failure a customer will not wait through.
 */
export async function voiceTurn(req: Request, res: Response): Promise<void> {
  const body = req.body as VoiceTurnBody;

  /* `{{session_id}}` arriving verbatim means the dynamic variable was never substituted. Treating
     it as an id would be worse than having none: every call in the world would share one session
     document, and each caller would inherit the last one's answers. */
  const fromQuery = String(req.query.sessionId ?? '').trim();
  const sessionId = (fromQuery.includes('{{') ? '' : fromQuery) || body.sessionId || '';

  if (!sessionId) {
    res.status(200).json({ speakText: 'Sorry, I lost track of this call. Could you start again?', isDone: false });
    return;
  }

  try {
    res.status(200).json(await runVoiceTurn(sessionId, body));
  } catch (err) {
    const known = err instanceof AppError;
    if (!known || err.status >= 500) logger.error({ err, sessionId }, 'voice turn failed');
    res.status(200).json({
      speakText: known && err.code === 'at_capacity'
        ? 'Sorry, we are very busy right now. Could you try again a little later?'
        : 'Sorry, something went wrong on my end. Could you say that again?',
      isDone: false,
    });
  }
}

/**
 * Starts a call: a session id, and the token a browser needs to join.
 *
 * The Retell API key never leaves this process. A browser that held it could create calls against
 * the account at will, so the token - which is scoped to one call - is the only thing handed out.
 *
 * The session id travels as a dynamic variable, so the agent can put it in the tool's query string
 * without ever having to say it, hear it, or invent one.
 *
 * With no key configured this still answers with a session id, which is what makes the whole voice
 * path testable from Postman with no Retell account at all.
 */
export async function createVoiceCall(req: Request, res: Response): Promise<void> {
  const sessionId = newVoiceSession();

  /* A second call in the same conversation continues it rather than starting it again.
     The page holds the checklist by then - from an earlier call's handover, or from typing - and
     hands it back here, so the caller is not asked their suburb twice in one sitting. Sent the
     same way the chat sends it, as JSON text, and stored under the new session before the call is
     minted so the very first spoken turn already knows everything. */
  const body = (req.body ?? {}) as {
    checklist?: string;
    place?: string;
    options?: string;
    message?: string;
    checklistDisplay?: string;
  };
  const carried = {
    checklist: asObject<Record<string, unknown>>(body.checklist),
    place: asObject<Place>(body.place),
    options: asObject<ChatOption[]>(body.options),
    display: asObject<Record<string, { title: string; value: string }>>(body.checklistDisplay),
  };
  const options = Array.isArray(carried.options) ? carried.options : [];

  if (carried.checklist || carried.place) {
    await getRepository().writeVoiceSession(sessionId, {
      checklist: carried.checklist ?? {},
      place: carried.place ?? null,
      options,
      // The page already has everything said before this call. Only this call's turns belong here.
      turns: [],
      checklistDisplay: carried.display ?? {},
      checklistPending: [],
      updatedAt: new Date().toISOString(),
    });
  }

  /* The opening line, written here and read by the agent - never composed by the speech model,
     same rule as every other sentence in this product. With nothing carried it is the ordinary
     greeting; with a conversation behind it, it says so and picks up the question already on
     screen, so pressing the microphone at the seventh question does not start again at hello. */
  const greeting = greetingFor({ display: carried.display ?? {}, message: body.message, options });

  if (!env.RETELL_API_KEY || !env.RETELL_AGENT_ID) {
    res.status(200).json({ sessionId, accessToken: null, configured: false });
    return;
  }

  try {
    const created = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: { authorization: `Bearer ${env.RETELL_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        agent_id: env.RETELL_AGENT_ID,
        retell_llm_dynamic_variables: { session_id: sessionId, greeting },
        metadata: { sessionId },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!created.ok) {
      logger.error({ status: created.status, body: await created.text() }, 'retell refused to create a web call');
      res.status(502).json({ error: { code: 'voice_unavailable', message: 'Could not start a voice call' } });
      return;
    }

    const { access_token: accessToken, call_id: callId } = (await created.json()) as { access_token?: string; call_id?: string };
    logger.info({ sessionId, callId }, 'voice call created');
    res.status(200).json({ sessionId, accessToken: accessToken ?? null, configured: true });
  } catch (err) {
    logger.error({ err }, 'could not reach retell to create a web call');
    res.status(502).json({ error: { code: 'voice_unavailable', message: 'Could not start a voice call' } });
  }
}

/**
 * The call, handed to a screen.
 *
 * A voice call ends and the customer is looking at a page that knows nothing about it. This is the
 * handover: the page asks for the session, renders what was said, and carries on in the text chat
 * from exactly where the speaking stopped - same checklist, same place, same conversation. The
 * customer can finish by typing, confirm the recap, or call again.
 *
 * Deliberately not a Retell webhook. The browser sees the call end anyway (the Web SDK says so),
 * it is the thing that has to render the result, and a webhook would add signature verification
 * and a second write path for nothing the customer would notice. That changes the day phone calls
 * exist, because then there is no browser.
 */
export async function voiceSession(req: Request, res: Response): Promise<void> {
  const sessionId = String(req.query.sessionId ?? '').trim();
  if (!sessionId) throw new AppError(400, 'bad_request', 'sessionId is required');

  const session = await (getRepository()).readVoiceSession(sessionId);
  if (!session) {
    // Not an error: a call that was never spoken on, or one older than the session's half hour.
    res.status(200).json({ sessionId, found: false, turns: [], checklist: null, place: null });
    return;
  }

  res.status(200).json({
    sessionId,
    found: true,
    turns: session.turns,
    /* Present once the call reached a quote. The caller agreed to the brief out loud and is now
       looking at a screen that has to show what came back, so this is where the page navigates. */
    resultId: session.resultId ?? null,
    /* The last turn as the text chat would have rendered it, so a caller who hung up mid-question
       finds it on screen with its options still tappable rather than a transcript that stops. */
    type: session.type ?? null,
    message: session.turns.at(-1)?.wrote ?? null,
    /* The brief panel, so it fills in while the call is still running rather than all at once when
       it ends. Answered on one side, still-to-come on the other. */
    checklistDisplay: session.checklistDisplay ?? {},
    checklistPending: session.checklistPending ?? [],
    /* `_ui` included, exactly as stored. The page posts this straight back as the chat's
       `knownChecklist`, and every field in `_ui` exists to stop a bug the comments there describe -
       so handing over a trimmed copy is how those bugs come back on the second front door. */
    checklist: session.checklist,
    place: session.place ?? null,
    options: session.options,
    updatedAt: session.updatedAt,
  });
}
