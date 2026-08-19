import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const FENCE = /<<<\s*(?:END\s*)?DESCRIPTION\s*>>>/gi;

// Control characters, zero-width joiners and bidi overrides: a classic way to hide instructions
// from a human reviewer while the model still reads them.
const INVISIBLE = new RegExp(
  '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u2064\\uFEFF]',
  'g',
);

export function sanitizeText(input: string): string {
  return input
    .normalize('NFKC')
    .replace(INVISIBLE, '')
    .replace(FENCE, '') // it must not be able to close the fence and speak as the system
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Mechanical facts, checked before a single token is paid for. Judgement — wrong trade, no prices,
 * off-topic — stays in the review prompt, where it belongs (docs/FLOW.md §8).
 */
export function assertSubmittable(text: string): void {
  if (text.length > env.MAX_TEXT_CHARS) {
    throw new AppError(
      413,
      `Your description is too long - keep it under ${env.MAX_TEXT_CHARS} characters`,
      'payload_too_large',
    );
  }
  if (!text) {
    throw new AppError(422, 'Send your pricing details and we will take a look', 'unprocessable');
  }
  if (text.length < env.MIN_TEXT_CHARS) {
    throw new AppError(
      422,
      'That is too short to be a price list - send your rates and we will take a look',
      'unprocessable',
    );
  }
  if (!/\d/.test(text)) {
    throw new AppError(
      422,
      'We could not find any prices in that - send your rates with the numbers included',
      'unprocessable',
    );
  }
}
