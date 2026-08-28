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
 * The last thing said on the call.
 *
 * The quote itself is never read out. Three businesses with five figures each is unlistenable, a
 * price heard once cannot be compared with anything, and a caller cannot scroll back through a
 * phone call - so the numbers go to the page, which can show all of them at once and keep showing
 * them. The call's job was to collect the brief, and it is finished.
 *
 * Deliberately says nothing about how many quotes came back, or whether any did. This same line
 * has to be true when nobody covers the suburb, and a cheerful count would be a lie exactly when
 * the customer is about to read bad news.
 */
const signOff = (): string =>
  'Beauty — leaving it with me. I am pulling your quotes together now, and they will be on your screen in a moment. Thanks for calling, bye for now.';

/**
 * The recap, as a person would say it.
 *
 * The written form ends "All correct?", which out loud invites a one-word answer to a list nobody
 * has finished hearing. Spoken, the same recap ends with a real question and an explicit way out,
 * because saying "no" to a machine is harder than tapping it.
 */
function readRecap(response: ChatResponse): string {
  const recap = spoken(response.message)
    .replace(/sorry\s*[—–-]\s*is that all correct\?/gi, '')
    .replace(/all correct\?/gi, '')
    .replace(/[\s.,—–-]+$/, '')
    .trim();

  const opener = recap ? `${recap}. ` : '';
  return `${opener}That is everything I need. Shall I go and find you some quotes? Or tell me what you would like to change.`;
}

/** The opening line of a call that has nothing behind it. */
export const OPENING_LINE =
  'Hi there, thanks for calling. I can get you fencing quotes from businesses near you — it only takes a couple of minutes. What are you after?';

/**
 * The first thing said on a call, given whatever the conversation already knows.
 *
 * A caller who typed half a brief and then pressed the microphone should not be greeted like a
 * stranger. Neither should they be walked straight into a question with no acknowledgement that
 * anything came before - so this re-orients first, then asks what was already on screen.
 *
 * Written here rather than by the speech model, and handed to Retell as a dynamic variable exactly
 * the way `{{speak_text}}` is. Nothing about this call's content is ever a model's to invent.
 */
export function greetingFor(carried: {
  display?: Record<string, { title: string; value: string }>;
  message?: string | null;
  options?: ChatOption[];
}): string {
  const known = Object.values(carried.display ?? {})
    .map((entry) => spoken(entry.value))
    .filter(Boolean);
  const question = carried.message?.trim() ? spoken(carried.message) : '';

  // Nothing carried at all: an ordinary first call.
  if (!known.length && !question) return OPENING_LINE;

  const recap = known.length ? ` I still have your details — ${known.join(', ')}.` : '';
  const options = speakable(carried.options ?? []);
  const choices = question && options.length ? ` ${readOptions(options)}` : '';

  return `Welcome back.${recap}${question ? ` ${question}` : ''}${choices}`;
}

export function toSpeech(response: ChatResponse): string {
  /* The suburb used to be the one answer voice could not take: `isMissing('suburb')` tests the
     geocoded place object, not the words, so a spoken suburb never satisfied it and the question
     came back for ever. `suburb.ts` now resolves it server-side, so it is asked out loud like any
     other question - and a postcode, which the question asks for, is the one answer that cannot
     be two places at once. */
  /* The call is over the moment the brief is agreed. The searching, the prices and the comparison
     all belong to the page, which the caller is already looking at. */
  if (response.type === 'result') return signOff();

  /* The recap, and the question the whole call has been building to. It is taken out loud rather
     than on screen, because a caller who has just answered eight questions by voice should not be
     handed a ninth to tap. Every value is read back first, which is what makes a spoken "yes"
     mean something: they have heard the whole brief before they agree to it. */
  if (response.type === 'confirmation') return readRecap(response);

  const options = speakable(response.options);
  if (!options.length) return spoken(response.message);

  return `${spoken(response.message)} ${readOptions(options)}`;
}
