import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../config.js';
import { AppError } from '../../http.js';
import { getRepository, type BusinessRepository } from '../../store.js';
import { runFencingChat } from '../controller.js';
import { saveChatResult } from '../saveResult.js';
import type { ChatOption, ChatResponse, Place } from '../schemas.js';
import { matchSpokenToOption } from './matchSpoken.js';
import { toSpeech } from './toSpeech.js';

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

export const voiceTurnBody = z.object({
  spokenText: z.string().default(''),
});
export type VoiceTurnBody = z.infer<typeof voiceTurnBody>;

export interface VoiceTurnResult {
  speakText: string;
  isDone: boolean;
  /** Present on the last turn: where the finished quote was written for the page to render. */
  resultId?: string;
}

export interface VoiceDeps {
  repo?: BusinessRepository;
}

/** A new call. The id is generated here so nothing a caller sends becomes a document key. */
export const newVoiceSession = () => randomUUID();

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
  const matched = session ? matchSpokenToOption(spoken, session.options as ChatOption[]) : null;
  const message = matched === null ? spoken : String(matched);

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

  /* Stored whole, `_ui` included. Every field in it exists to stop a bug: without `place` the
     suburb question reopens, without `rejectedPlaces` an uncovered suburb loops for ever, without
     `lastValues` the no-model turn above stops working. Trimming it is how those come back. */
  await repo.writeVoiceSession(sessionId, {
    checklist: response.checklist,
    place: response.place,
    options: response.options,
    updatedAt: new Date().toISOString(),
  });

  const isDone = response.type === 'result';
  const resultId = isDone ? await saveChatResult(response, repo) : null;

  logger.info({ sessionId, matched: matched !== null, type: response.type, isDone }, 'voice turn');

  return { speakText: toSpeech(response), isDone, ...(resultId ? { resultId } : {}) };
}

/**
 * Every failure leaves here as something speakable with `isDone: false`, never as a status the
 * agent cannot read. A call that gets a 500 goes silent, and silence on a phone call is the one
 * failure a customer will not wait through.
 */
export async function voiceTurn(req: Request, res: Response): Promise<void> {
  const sessionId = String(req.query.sessionId ?? '').trim();
  if (!sessionId) {
    res.status(200).json({ speakText: 'Sorry, I lost track of this call. Could you start again?', isDone: false });
    return;
  }

  try {
    res.status(200).json(await runVoiceTurn(sessionId, req.body as VoiceTurnBody));
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

/** Mints a session for a browser about to start a call. */
export function createVoiceCall(_req: Request, res: Response): void {
  res.status(200).json({ sessionId: newVoiceSession() });
}
