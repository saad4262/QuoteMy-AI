import type { ChatOption, ChatResponse } from '../schemas.js';

/**
 * One turn, as words to be spoken.
 *
 * Everything the customer hears is built here, from the response the same pipeline produced for the
 * text chat. The speech agent reads this out and adds nothing - it is a microphone and a speaker.
 * Nothing in this file decides anything about the conversation; it only decides how to say it.
 */

const LETTERS = 'ABCDEFGH';

/** "VIC 3806" is read as "vick three thousand eight hundred and six" if it is left alone. */
const STATES: Record<string, string> = {
  VIC: 'Victoria', NSW: 'New South Wales', QLD: 'Queensland', SA: 'South Australia',
  WA: 'Western Australia', TAS: 'Tasmania', NT: 'Northern Territory', ACT: 'A C T',
};

/** `__other__` is a text box on screen. There is no text box in a phone call. */
const speakable = (options: ChatOption[]): ChatOption[] => options.filter((o) => String(o.value) !== '__other__');

/**
 * "1.8m" is read as "one point eight metres". Left alone, a speech engine says "one point eight em"
 * or "eighteen metres" depending on its mood, and the customer agrees to a fence they did not ask
 * for.
 */
export function spoken(text: string): string {
  return text
    .replace(/\b(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\b,?\s*(\d{4})\b/g, (_, state: string, postcode: string) => `${STATES[state]} ${postcode.split('').join(' ')}`)
    .replace(/\b(VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\b/g, (_, state: string) => STATES[state]!)
    .replace(/(\d+)\.(\d+)\s*m\b/g, (_, whole: string, part: string) => `${whole} point ${part.split('').join(' ')} metres`)
    .replace(/(\d+)\s*m\b/g, '$1 metres')
    .replace(/\$([\d,]+)/g, (_, amount: string) => `${amount.replace(/,/g, '')} dollars`)
    .replace(/\bGST\b/g, 'G S T')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Reads the choices out as lettered options, then invites anything else. */
function readOptions(options: ChatOption[]): string {
  const lines = options.map((option, index) => `Option ${LETTERS[index]}, ${spoken(option.label)}.`);
  return `${lines.join(' ')} Or just tell me in your own words.`;
}

/**
 * A results turn read like a person, not like a table.
 *
 * Three businesses with five figures each is unlistenable. The cheapest is named with its price and
 * the rest are counted, because what a customer wants from a phone call is the answer, and the
 * detail is on their screen when they want it.
 */
function readResult(response: ChatResponse): string {
  if (!response.results.length) return spoken(response.message);

  const best = response.results[0]!;
  const others = response.results.length - 1;
  const rest =
    others === 0
      ? ''
      : others === 1
        ? ' There is one more quote as well, a little higher.'
        : ` There are ${others} more quotes as well.`;

  const saved = response.comparison?.potentialSavings;
  const savings = saved && saved > 0 ? ` That is about ${Math.round(saved)} dollars less than what you have.` : '';

  return `${spoken(best.businessName)} can do it for ${Math.round(best.estimatedTotal)} dollars.${rest}${savings} I have put the details on your screen.`;
}

export function toSpeech(response: ChatResponse): string {
  /* The suburb used to be the one answer voice could not take: `isMissing('suburb')` tests the
     geocoded place object, not the words, so a spoken suburb never satisfied it and the question
     came back for ever. `suburb.ts` now resolves it server-side, so it is asked out loud like any
     other question - and a postcode, which the question asks for, is the one answer that cannot
     be two places at once. */
  if (response.type === 'result') return readResult(response);

  /* The end of a call. Every answer is in, and what is left is the one question worth getting
     right - so it goes to the screen rather than being agreed to out loud. A misheard "yes" on a
     recap is not a small mistake; it is the whole job, wrong, with a price on it. The recap is
     still read, because a customer should hear what they are about to be shown. */
  if (response.type === 'confirmation') {
    return `${spoken(response.message)} I have put all of that on your screen. Have a look, and tap confirm if it is right — I will get your quotes ready. Thanks for calling, bye for now.`;
  }

  const options = speakable(response.options);
  if (!options.length) return spoken(response.message);

  return `${spoken(response.message)} ${readOptions(options)}`;
}
