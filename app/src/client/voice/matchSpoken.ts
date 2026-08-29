import { numbersIn, oneOf, slug } from '../fuzzyMatch.js';
import type { ChatOption } from '../schemas.js';

/**
 * What the customer said, resolved back to one of the choices they were just read - or nothing.
 *
 * The point of this function is the zero-model turn. When the value it returns is one the last turn
 * offered, `runFencingChat` recognises it in code and never calls the model at all
 * (`controller.ts:68`), which is about three seconds a customer does not spend listening to
 * silence. That is the commonest turn in the conversation, so it is worth getting right.
 *
 * Which is also why it must return a value that is EXACTLY one of the offered ones, or null. A
 * near-miss does not fail loudly - it silently records an answer the customer never gave, and they
 * find out at the price. Asking again is much cheaper than that, so anything less than confident
 * returns null and the raw sentence goes to the model, which is good at reading sentences.
 */

/** `__other__` opens a text box on screen. Spoken aloud it means nothing, so it is never offered. */
const OFFERABLE = (option: ChatOption) => String(option.value) !== '__other__';

/** "Option B", "the second one", "number three" - a position rather than an answer. */
const LETTER = /^(?:option\s+)?([a-f])$/;
const NUMBERED = /^(?:option|number|choice)\s+(\d{1,2})$/;
const ORDINAL: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6,
  '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, '6th': 6,
};

/**
 * Politeness and filler that carries no answer in it.
 *
 * The punctuation rule spares a point that sits between two digits: stripping it turned "1.8
 * metres" into "1 8 metres", which is two numbers where the customer said one - it read as saying
 * more than the answer, and every spoken height stopped taking the shortcut below.
 */
const tidy = (spoken: string): string =>
  spoken
    .toLowerCase()
    .replace(/(?<!\d)[.,!?]|[.,!?](?!\d)/g, ' ')
    .replace(/\b(please|thanks|thank you|um|uh|err|i'?ll (?:take|have|go with)|let'?s (?:do|go with)|i want|give me|the|one)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Conversation, not answer. Whatever is left of a sentence once the answer and these are taken out
 * is the customer telling us something else.
 */
const FILLER = new Set([
  'yeah', 'yep', 'yup', 'yes', 'ok', 'okay', 'sure', 'right', 'righto', 'cheers', 'mate', 'sorry',
  'so', 'well', 'just', 'like', 'go', 'with', 'is', 'are', 'be', 'it', 'that', 'this', 'and', 'or',
  'of', 'a', 'an', 'to', 'in', 'at', 'on', 'for', 'my', 'our', 'we', 'i',
  // Units. "1.8 metres" is the height and the word for it, not the height and something else.
  'm', 'mm', 'cm', 'metre', 'metres', 'meter', 'meters', 'ft', 'feet', 'foot',
  'tall', 'high', 'long', 'wide', 'gate', 'gates',
  /* Verbs and hedges. Safe to ignore wholesale: a second answer is a thing or a number, never a
     verb, so nothing here can be the piece of the sentence worth sending to the model. */
  'need', 'want', 'wanted', 'looking', 'prefer', 'reckon', 'think', 'get', 'have', 'take', 'do',
  'would', 'will', 'can', 'could', 'about', 'around', 'roughly', 'maybe', 'probably', 'you', 'me',
  'us', 'there', 'im', 'id', 'ive', 'ill', 'its', 'thats', 'dont', 'youre',
]);

/** Part of a number rather than a word of its own - the numeric check below judges these. */
const NUMBER_WORD = /^(?:point|hundred|thousand|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)$/;

/**
 * Did they say more than this answer?
 *
 * The shortcut below exists to skip the model on a short reply. Handed a whole briefing - "I want a
 * fence in Pakenham, colorbond, 1.5 metres, 50 metres long" - it found `colorbond` inside the
 * sentence, returned it, and `runFencingChat` then skipped the model precisely BECAUSE the answer
 * was recognised. The suburb, the height and the length were never read by anything. The caller
 * heard "got it" and was then asked all three again, one at a time, which is the single worst thing
 * this product does on a phone call.
 *
 * So the shortcut only applies when the answer accounts for the whole sentence. Anything else goes
 * to the model, which is what reads sentences. The cost of getting this wrong in the strict
 * direction is three seconds; in the loose direction it is four answers thrown away.
 */
function saysMoreThanTheAnswer(said: string, chosen: ChatOption): boolean {
  const answer = new Set((slug(chosen.label) + '-' + slug(chosen.value)).split('-').filter(Boolean));

  const leftover = said
    .split(' ')
    .filter(
      (word) =>
        word &&
        !/\d/.test(word) &&
        !NUMBER_WORD.test(word) &&
        !answer.has(slug(word)) &&
        // Contractions land here whole - "i'll", "i'd" - so they are checked stripped as well.
        !FILLER.has(word) &&
        !FILLER.has(word.replace(/['\u2019]/g, '')),
    );
  if (leftover.length) return true;

  /* Numbers are judged on their value rather than skipped as words, because two words can carry
     two answers - "colorbond, 1.5" is a material and a height. Words count as numbers here:
     "fifty metres" is a length whether or not the transcriber wrote it with digits. */
  const inAnswer = numbersIn(`${chosen.label} ${chosen.value}`);
  return numbersIn(said).some((value) => !inAnswer.includes(value));
}

export function matchSpokenToOption(spoken: string, options: ChatOption[]): string | number | null {
  const offerable = (options ?? []).filter(OFFERABLE);
  if (!offerable.length) return null;

  const said = tidy(spoken);
  if (!said) return null;

  /* A value first, then a position.
     "Two" has to mean the answer 2 when 2 is one of the choices - it is a real answer to "how many
     gates". Only when nothing matches by value does a bare position get considered, and then only
     when it is said explicitly ("option two"), never as a bare digit. */
  const byValue = oneOf(
    said,
    offerable.map((option) => String(option.value)),
    (value) => offerable.find((option) => String(option.value) === value)?.label ?? value,
  );
  const resolved =
    byValue !== null
      ? { chosen: offerable.find((option) => String(option.value) === byValue) ?? null, whole: false }
      : resolve(said, offerable);

  const { chosen, whole } = resolved;
  if (!chosen) return null;
  /* `whole` means the match was the entire sentence - "option B", or the label and nothing else.
     There is by definition nothing else in there to lose, so the guard has nothing to judge. */
  return whole || !saysMoreThanTheAnswer(said, chosen) ? chosen.value : null;
}

/**
 * Which choice they meant, or none. `whole` says the match used up the entire sentence, so there
 * is nothing else in it that could be a second answer.
 */
function resolve(said: string, offerable: ChatOption[]): { chosen: ChatOption | null; whole: boolean } {
  const letter = LETTER.exec(said);
  const numbered = NUMBERED.exec(said);
  const ordinal = ORDINAL[said] ?? (said === 'last' ? offerable.length : undefined);

  const position = letter?.[1]
    ? letter[1].charCodeAt(0) - 96
    : numbered?.[1]
      ? Number(numbered[1])
      : ordinal;

  if (position && position >= 1 && position <= offerable.length) return { chosen: offerable[position - 1]!, whole: true };

  /* Said the label rather than the value - "treated pine" for `timber_pine`. `oneOf` above already
     tried the labels, but only against the value list; this catches a label whose own words do not
     appear in its slug at all. Ties still resolve to nothing, same discipline. */
  const exact = offerable.filter((option) => slug(option.label) === slug(said));
  if (exact.length === 1) return { chosen: exact[0]!, whole: true };

  /* Said the label inside a sentence: "Treated pine. I need treated pine.", "yeah, go with the
     Colorbond one". People do not answer a spoken question with a bare noun, and every one of
     those turns was going to the model - three seconds of a phone call spent being told something
     this code already knew, because it wrote the options last turn.
     Matched on slug word boundaries, never as a raw substring, so "pine" cannot be found inside
     another word. Short labels are excluded outright: "no" appears in "no worries", which means
     yes, and recording that as a no is exactly the silent wrong answer this file exists to refuse.
     Two labels in one sentence resolves to nothing, same as everywhere else here. */
  const heard = slug(said);
  const inside = offerable.filter((option) => {
    const label = slug(option.label);
    if (label.length < 4) return false;
    return heard === label || heard.startsWith(`${label}-`) || heard.endsWith(`-${label}`) || heard.includes(`-${label}-`);
  });
  return { chosen: inside.length === 1 ? inside[0]! : null, whole: false };
}
