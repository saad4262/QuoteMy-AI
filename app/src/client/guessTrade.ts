import { z } from 'zod';
import { getAiClient, type AiClient } from '../ai.js';
import { logger } from '../config.js';
import { TRADE_WORDS } from '../messages.js';
import { TRADES, type Trade } from '../vocab.js';

/**
 * The last thing tried before asking "which service?" - reading what they MEANT.
 *
 * `TRADE_KEYWORDS` is a list of words, and a customer is not. "Hello bro, today in my house there
 * is some function in my family so I need an urgent home renevation facility" names the trade
 * plainly to any human and matched nothing at all: one letter was wrong. The typo pass in
 * `routeTrade.ts` catches that particular case, and it cannot catch the next one - "we're doing the
 * whole place up before the wedding" names no trade word at all and still says exactly what it
 * wants.
 *
 * So this runs LAST, and only when everything cheaper has found nothing:
 *
 *     exact patterns  ->  typo pass  ->  [here]  ->  ask which service
 *
 * Three things keep it honest:
 *
 *   It may answer NONE, and often should. Somebody asking for a plumber, a dam or home decor is not
 *   a trade we do, and a router that always picks one would put them into a quote for work nobody
 *   is going to do. The picker exists for exactly those, and this must not empty it.
 *
 *   It may not be used to OVERRULE. It never sees a message the patterns already resolved - by the
 *   time this is called they have both come back empty - so it can add a routing, never change one.
 *
 *   It costs a call, so it only runs on the messages that were about to cost a QUESTION instead.
 *   A customer who has to be asked which service they want has already lost a turn; this is cheaper
 *   than that in the only currency the customer has.
 */

const guessSchema = z.object({
  /** One of the published slugs, or the string "none". Never a trade that is not offered. */
  trade: z.string(),
  /** Whether the message actually says so, as opposed to could be read that way. */
  confident: z.boolean(),
});

const systemPrompt = (published: readonly Trade[]): string =>
  [
    'You route a customer message to one trade, or to none. You answer with JSON only.',
    '',
    'The trades on offer, by slug:',
    ...published.map((trade) => `  ${trade} - ${TRADE_WORDS[trade].trade} (a ${TRADE_WORDS[trade].noun})`),
    '',
    'Return the slug when the message is clearly about that trade, however it is worded, however it',
    'is spelled, and whatever else is in it. People describe the job rather than naming it: "doing',
    'the whole place up before the wedding" is a renovation, "the back yard needs closing in for the',
    'dog" is fencing, "the bathroom floor is cracked and lifting" is tiling.',
    '',
    'RETURN "none" WHENEVER IT IS NOT ONE OF THESE, AND THAT IS NOT A FAILURE.',
    'A plumber, an electrician, a pool, a dam, a shed, a treehouse, curtains and cushions, a removalist,',
    'a cleaner, a locksmith - none of these are on the list and none of them may be forced onto it.',
    'Return "none" for a greeting, for a question about something else, and for anything you cannot',
    'tell. The customer is offered the list when you say none, which is a perfectly good outcome.',
    '',
    'A CUSTOMER DESCRIBES THE PROBLEM, NOT THE TRADE, and that still counts as saying so. "The soil',
    'keeps washing down the slope onto my driveway" is a retaining wall. "The back yard needs closing',
    'in so the dog cannot get out" is fencing. "The bathroom floor is cracked and lifting" is tiling.',
    'Nobody has to name the trade for the message to be about it.',
    '',
    'confident: true when one trade on the list plainly fits what they are describing. False when two',
    'would fit equally well, when only a single ambiguous word points at it, or when the job might',
    'not be on the list at all. A false answer is discarded and the customer is shown the list, so',
    'there is no cost to being unsure - and no credit for a lucky guess.',
  ].join('\n');

export interface GuessDeps {
  ai?: AiClient;
}

/**
 * The trade this message is about, or null to go on and ask.
 *
 * Null on every failure - a model error, a slug that is not published, an unconfident answer, or a
 * message too short to mean anything. Falling through to the question is always safe; guessing is
 * what is not.
 */
export async function guessTrade(
  message: string,
  published: readonly Trade[],
  deps: GuessDeps = {},
): Promise<Trade | null> {
  const said = message.trim();
  /* Not worth a call. "hi" and "quote?" mean nothing to route on, and the question they get instead
     is the right answer rather than a worse one. */
  if (said.length < 12 || !published.length) return null;

  try {
    const ai = deps.ai ?? getAiClient();
    const result = await ai.callStructured<z.infer<typeof guessSchema>>({
      name: 'route',
      schema: guessSchema,
      system: systemPrompt(published),
      user: said.slice(0, 600),
      /* Tiny on purpose - the answer is a slug and a boolean. Left on the default model rather
         than dropped to a cheap tier: this decides which trade a customer is routed to, and a
         wrong routing costs more than the call ever will. About $0.001 a time, and only on
         messages that were otherwise about to cost the customer a question. */
      maxOutputTokens: 60,
      /* Routing must not hold a turn up. Falling through to the picker is a fine outcome and a
         much better one than a customer watching a spinner. */
      timeoutMs: 6000,
    });

    const guess = result.data;
    if (!guess.confident) return null;
    /* Checked against what is actually PUBLISHED, not against `TRADES`: a model naming a trade this
       deployment does not serve would route a customer to a screen with nothing behind it. */
    const named = (TRADES as readonly string[]).includes(guess.trade) ? (guess.trade as Trade) : null;
    return named && published.includes(named) ? named : null;
  } catch (err) {
    /* Never fatal. This is an optimisation on the way to a question that works perfectly well
       without it, so a model that is down, slow or over budget costs the customer one question. */
    logger.warn({ err }, 'could not guess the trade from the message');
    return null;
  }
}
