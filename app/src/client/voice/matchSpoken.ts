import { oneOf, slug } from '../fuzzyMatch.js';
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

/** Politeness and filler that carries no answer in it. */
const tidy = (spoken: string): string =>
  spoken
    .toLowerCase()
    .replace(/[.,!?]/g, ' ')
    .replace(/\b(please|thanks|thank you|um|uh|err|i'?ll (?:take|have|go with)|let'?s (?:do|go with)|i want|give me|the|one)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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
  if (byValue !== null) return offerable.find((option) => String(option.value) === byValue)?.value ?? null;

  const letter = LETTER.exec(said);
  const numbered = NUMBERED.exec(said);
  const ordinal = ORDINAL[said] ?? (said === 'last' ? offerable.length : undefined);

  const position = letter?.[1]
    ? letter[1].charCodeAt(0) - 96
    : numbered?.[1]
      ? Number(numbered[1])
      : ordinal;

  if (position && position >= 1 && position <= offerable.length) return offerable[position - 1]!.value;

  /* Said the label rather than the value - "treated pine" for `timber_pine`. `oneOf` above already
     tried the labels, but only against the value list; this catches a label whose own words do not
     appear in its slug at all. Ties still resolve to nothing, same discipline. */
  const exact = offerable.filter((option) => slug(option.label) === slug(said));
  if (exact.length === 1) return exact[0]!.value;

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
  return inside.length === 1 ? inside[0]!.value : null;
}
