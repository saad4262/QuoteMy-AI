import { DESCRIBED } from '../ingest.js';
import { TRADE_WORDS } from '../messages.js';
import type { Trade } from '../vocab.js';
import type { DocHints, FieldSpec, Refine } from './fieldSpec.js';
import type { TradeSchema } from './schema.js';

/**
 * Deterministic, regex-based reading of an attached quote/photo transcript. Ported from n8n's
 * `Read Attachment Facts` node.
 *
 * Why this is not left to the model: a quote is written in a small, closed trade vocabulary
 * ("20L of 1.8H", "Disposal of 25m of old fence"), and the model read it *usually* - the same PDF
 * gave five fields on one run and two on the next, and the customer got asked for a height they
 * had already attached. Regex gives the same document the same fields, every run.
 *
 * WHAT IS READ is the trade's own business and lives in `FieldSpec.docHints`, beside the field it
 * fills. HOW it is read is here, and is the same for every trade: this file knows about first
 * matches and refusals and negation, and nothing whatsoever about fences or tiles.
 *
 * That split is the point. This used to be one file hardcoded to fencing with no `trade` argument
 * at all - the only part of the customer pipeline that was not per-trade data, while the checklist
 * (`TRADE_FIELDS`), the pricing (`TRADE_PRICING`), the vocabulary and the prompts all were. A
 * twentieth trade now needs hints on its fields, not a twentieth copy of this algorithm.
 *
 * Everything read speaks the schema's own slugs (timber_pine, pool_glass, restricted_access…),
 * because those are what businesses publish rates against. `fieldSpec.test.ts` is what holds every
 * trade's hints to its own published vocabulary - a slug with no home would be dropped in silence
 * by `validate`, which is the one failure mode here nobody would ever see.
 */

/**
 * What a document gave up, keyed by the field it answers.
 *
 * An index signature rather than a hand-written list of fencing's six, because the reader is now
 * generic over whatever fields a trade declares. The type safety that goes missing here is bought
 * back in `fieldSpec.test.ts`, which checks every hint's slug against that trade's vocabulary -
 * a stronger guarantee than a key name, and the one that actually matters.
 */
export type DocFacts = Record<string, string | number | string[]>;

/**
 * How much of a transcript this will read, and deliberately not the 4,000 characters the model gets.
 *
 * Those two numbers answer different questions. The model's is a token budget - every character
 * costs money on every turn. This one costs nothing: it is regular expressions over a string, and
 * the only reason it has a limit at all is that an uploaded text file can be twenty megabytes.
 *
 * They were the same number, and it quietly cost the one fact a long quote most reliably carries:
 * the total sits at the BOTTOM of the page, so a room-by-room tiling quote had its total cut off
 * while its first line was read fine.
 */
const READ_LIMIT = 20_000;

/** The generic address patterns. Only the trade's own name in `LETTERHEAD` differs. */
// The job address, for the picker's benefit only. This is NOT checklist.suburb and never becomes
// it: ranking measures real distance, so it needs coordinates from Google, and a line of text can
// only ever be a head start. Labelled lines first - a contractor's letterhead is also an address,
// and quoting it would send the job to the wrong side of the city.
const ADDRESS: RegExp[] = [
  /^[^\n]{0,40}\b(?:property|site|job|install(?:ation)?)\s*address\s*[:\-–]\s*([^\n]+)$/im,
  /^[^\n]{0,10}\baddress\s*[:\-–]\s*([^\n]+)$/im,
  /^[^\n]{0,40}\b(?:suburb|location)\s*[:\-–]\s*([^\n]+)$/im,
  // Unlabelled last resort: a place written the way Australian addresses are written.
  /\b([A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,3}\s+(?:VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\s+\d{4})\b/,
];

/**
 * The contractor's own address is on the page too, usually at the top, and suggesting it would send
 * the job to whichever suburb that business trades from.
 *
 * The trade's half comes from `TRADE_WORDS[trade].mentions`, which already exists and is already
 * the one place a trade's own words are spelled out. Everything else here names a business rather
 * than a job and is shared by every trade - as is the whole of `ADDRESS` above, and the total-line
 * pattern below. Three facts every trade's quote carries the same way, written once.
 */
const letterheadFor = (trade: Trade): RegExp =>
  new RegExp(
    `\\b(?:abn|acn|pty|ltd|p\\/l|phone|mobile|email|www\\.|@|landscap|constructions?|quotation|invoice|tax invoice)\\b` +
      `|(?:${TRADE_WORDS[trade].mentions.source})`,
    'i',
  );

function readAddress(text: string, trade: Trade): string | null {
  const letterhead = letterheadFor(trade);
  for (let index = 0; index < ADDRESS.length; index += 1) {
    const match = text.match(ADDRESS[index]!);
    if (!match) continue;
    const line = String(match[1] || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    // A label with nothing useful after it ("Address: TBC") is not a location. A street number or
    // a state code is what makes it something Google can actually find.
    if (!line || !/\d|\b(?:VIC|NSW|QLD|SA|WA|TAS|NT|ACT)\b/i.test(line)) continue;
    const unlabelled = index === ADDRESS.length - 1;
    if (unlabelled) {
      const lineStart = text.lastIndexOf('\n', match.index) + 1;
      let lineEnd = text.indexOf('\n', match.index);
      if (lineEnd === -1) lineEnd = text.length;
      if (letterhead.test(text.slice(lineStart, lineEnd))) continue;
    }
    return line;
  }
  return null;
}

/**
 * The headline the customer means when they say what they were quoted: GST-inclusive, so the
 * largest of them, and never the Subtotal. The '$' is required - without it the "Total" column
 * heading swallows the first line item's quantity instead.
 */
function readTotal(text: string): number | null {
  const totals = [...text.matchAll(/(sub[\s-]*)?total\b[^\n$]{0,16}\$\s?([\d,]+(?:\.\d{1,2})?)/gi)]
    .filter((match) => !match[1])
    .map((match) => Number(match[2]!.replace(/,/g, '')))
    .filter((value) => Number.isFinite(value) && value > 0);
  return totals.length ? Math.max(...totals) : null;
}

function firstNumber(text: string, patterns: [RegExp, Refine][]): number | null {
  for (const [pattern, refine] of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = refine(Number(match[1]), match);
    if (value !== null && Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

/** Is this field even being talked about? Two-stage hints ask before they read - see `requires`. */
function gateOpen(text: string, hints: Extract<DocHints, { values: unknown }>): boolean {
  if (!hints.requires) return true;
  return hints.requires.some((pattern) => {
    pattern.lastIndex = 0; // these carry /g, and a stale lastIndex would skip the first match
    return [...text.matchAll(pattern)].some(
      (match) => !hints.negatedBy?.test(text.slice(Math.max(0, match.index! - 30), match.index)),
    );
  });
}

/**
 * One field, read off the document. Null means "the page did not say", which is never the same as
 * "the page said there is none" - that second one is an empty array, and only `multiEnum` can say it.
 */
function readField(text: string, spec: FieldSpec): string | number | string[] | null {
  // Two facts that are not the trade's business: a total is a total, whoever wrote the quote.
  if (spec.type === 'money') return readTotal(text);

  const hints = spec.docHints;
  // No hints is the safe default, and it is what every unread field relies on: it gets asked.
  if (!hints) return null;

  if ('quantity' in hints) {
    if (hints.refuse?.some((pattern) => pattern.test(text))) return null;
    const found = firstNumber(text, hints.quantity);
    const value = hints.then ? hints.then(found) : found;
    return value || null;
  }

  if (!gateOpen(text, hints)) return null;

  if (spec.type === 'multiEnum') {
    /* Read as a complete answer or not at all. A page that names rock has not ruled out a slope,
       but it HAS said the site is not "nothing tricky" - and half an answer here would silently
       drop a surcharge the business charges for. */
    const found = hints.values.filter(([, pattern]) => pattern.test(text)).map(([value]) => value);
    if (found.length) return found;
    return hints.none?.test(text) ? [] : null;
  }

  return hints.values.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}

export interface AttachmentFacts {
  docFacts: DocFacts;
  docSuburbHint: string | null;
}

/**
 * The `[filename]` line `readSource` puts above each attachment's transcript.
 *
 * It is what makes one string carrying four documents separable again. The bodies are read without
 * it, because a header is not content: a file called `Bathroom-Tiling-Quote-Berwick-VIC-3806.pdf`
 * is a job address and a tile type as far as a regular expression is concerned.
 */
const DOCUMENT_HEADER = /^\[([^\]\n]{1,60})\]$/gm;

/**
 * Every document's body, minus the ones the model DESCRIBED rather than copied.
 *
 * That exclusion is the most important line in this file. Everything here is regular expressions
 * over text, and what comes out is trusted without any further check - `mergeAndDecide` runs
 * `mentioned()` over the model's claims and deliberately not over these, because a copy of a page
 * cannot invent a figure and there is nothing to verify.
 *
 * A description is the opposite kind of thing: the model saying what it thinks it can see in a
 * photograph of a room. Read it here and that guess arrives on the customer's brief wearing the
 * clothes of a fact taken straight off their own quote, with the one check that might have caught
 * it deliberately switched off. So descriptions never reach this reader at all - they go to the
 * model, which is allowed to weigh them, and no further.
 *
 * `split` with a capturing group hands back the labels interleaved with the bodies, which is what
 * makes each body answerable for its own header.
 */
function splitDocuments(transcript: string): string[] {
  const parts = transcript.split(DOCUMENT_HEADER);
  const bodies: string[] = [];

  // Index 0 is whatever came before the first header - typed text, which has no header of its own.
  const first = parts[0]?.trim();
  if (first) bodies.push(first);

  for (let i = 1; i < parts.length; i += 2) {
    const label = parts[i] ?? '';
    const body = parts[i + 1]?.trim();
    if (body && !label.endsWith(DESCRIBED)) bodies.push(body);
  }

  return bodies;
}

/** Everything one document had to say, before it is weighed against the others. */
function readDocument(text: string, schema: TradeSchema): AttachmentFacts {
  const docFacts: DocFacts = {};
  /* `schema.fields`, not the compiled `TRADE_FIELDS`: this reads the same checklist the rest of the
     turn is working from, so a trade whose spec was published rather than compiled is read for the
     fields it actually has. The hints themselves always survive that publish - `schema.ts` takes
     anything holding a regular expression from the code every time. */
  for (const spec of schema.fields) {
    // The address is an output of its own, deliberately: it is a head start for the Google picker
    // and must never become `checklist.suburb`.
    if (spec.type === 'place') continue;
    const value = readField(text, spec);
    if (value !== null) docFacts[spec.docKey ?? spec.key] = value;
  }
  return { docFacts, docSuburbHint: readAddress(text, schema.trade) };
}

/**
 * One answer per field, across every document that had one.
 *
 * The rule is the one this whole reader is built on: where they agree, keep it; where they disagree,
 * read nothing and let the customer be asked. A height off one quote and a total off another do
 * describe a job nobody priced - but only for the fields the two documents actually contradict each
 * other on, and that is a far smaller set than "everything".
 *
 * This used to be all-or-nothing: more than one file and the reader switched off whole. That is
 * mostly a tiling problem, because a tiling customer attaches the quote AND three photographs of
 * the bathroom, and the photographs say nothing at all - so a quote that contradicted nothing had
 * every figure on it thrown away for the company it arrived in.
 */
function agreedAcross(perDocument: AttachmentFacts[]): AttachmentFacts {
  const keep = <T>(values: T[]): T | null => {
    const first = JSON.stringify(values[0]);
    return values.every((value) => JSON.stringify(value) === first) ? values[0]! : null;
  };

  const docFacts: DocFacts = {};
  const keys = new Set(perDocument.flatMap((one) => Object.keys(one.docFacts)));
  for (const key of keys) {
    const stated = perDocument.map((one) => one.docFacts[key]).filter((value) => value !== undefined);
    const agreed = keep(stated);
    if (agreed !== null) docFacts[key] = agreed;
  }

  const addresses = perDocument.map((one) => one.docSuburbHint).filter((hint): hint is string => Boolean(hint));
  return { docFacts, docSuburbHint: addresses.length ? keep(addresses) : null };
}

/**
 * Everything the attachments say that they do not disagree about.
 *
 * Takes the transcript as `readSource` built it, `[filename]` headers and all - those headers are
 * how the documents are told apart, so stripping them before this point would put four quotes back
 * into one.
 */
export function readAttachmentFacts(transcript: string, schema: TradeSchema): AttachmentFacts {
  const documents = splitDocuments(transcript.slice(0, READ_LIMIT));
  if (!documents.length) return { docFacts: {}, docSuburbHint: null };

  return agreedAcross(documents.map((text) => readDocument(text, schema)));
}
