/**
 * Deterministic, regex-based reading of an attached quote/photo transcript. Ported from n8n's
 * `Read Attachment Facts` node.
 *
 * Why this is not left to the model: a quote is written in a small, closed trade vocabulary
 * ("20L of 1.8H", "Disposal of 25m of old fence"), and the model read it *usually* - the same PDF
 * gave five fields on one run and two on the next, and the customer got asked for a height they
 * had already attached. Regex gives the same document the same fields, every run.
 *
 * Everything here speaks the schema's own slugs (timber_pine, pool_glass, restricted_access…),
 * because those are what businesses publish rates against.
 */

export interface DocFacts {
  material?: string;
  heightMm?: number;
  lengthMeters?: number;
  removal?: 'timber' | 'metal';
  conditions?: string[];
  existingPrice?: number;
}

// Heights arrive as metres, centimetres or millimetres and the three ranges barely overlap: under
// 10 was metres, 10-300 was centimetres (nothing is a 150mm fence, while a 150cm one is
// standard), above 300 is already millimetres.
const toMm = (value: number) => (value < 10 ? Math.round(value * 1000) : value <= 300 ? Math.round(value * 10) : Math.round(value));

// Longest unit spelling first, so "1.8 metres high" doesn't stop at the "m".
const UNIT = '(?:millimetres?|millimeters?|centimetres?|centimeters?|metres?|meters?|mm|cm|m)';

type Refine = (value: number, match: RegExpMatchArray) => number | null;

// Capital H and L are the trade's own suffixes ("1.8H" is a height, "20L" is a run) and are
// matched case-sensitively on purpose - a lowercase h is just the start of a word.
const HEIGHT: [RegExp, Refine][] = [
  [/(\d+(?:\.\d+)?)\s?(?:mm|m)?\s?H\b/, toMm],
  [/\bH\s?[-:]?\s?(\d{3,4})\b/, toMm],
  // Fences run 4-8ft. Ten or more feet is the length of the run, not how tall it is. Inches
  // count: 5'6" is 1676mm, and dropping them quietly shortens the fence by half a paling.
  [
    /(\d+(?:\.\d+)?)\s*(?:ft|foot|feet|')\s*(\d+)?\s*(?:"|in\b|inch(?:es)?)?/i,
    (value, match) => (value < 10 ? Math.round(value * 304.8 + (Number(match[2]) || 0) * 25.4) : null),
  ],
  [new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${UNIT}?\\s*(?:high|height|tall)\\b`, 'i'), toMm],
  [/(?:height|high)\b\D{0,10}?(\d+(?:\.\d+)?)/i, toMm],
];

// "20 to 30 metres" is not an answer. The rate is charged per metre, so a span prices a job
// nobody described - better to read no length at all and let the agent ask which is closer.
const RANGE = [
  /\b\d{1,4}(?:\.\d+)?\s*(?:m\b|metres?|meters?)?\s*(?:-|–|—|to)\s*\d{1,4}(?:\.\d+)?\s*(?:m\b|lm\b|lineal|metres?|meters?)/i,
  /\bbetween\s+\d{1,4}[^\n]{0,14}?\d{1,4}\s*(?:m\b|lm\b|lineal|metres?|meters?)/i,
];

// Explicit shorthand first. The loose ones carry a 3m floor: a "1.8m" sitting on the page is the
// height, and nobody books a two metre run of fence.
const asRun = (value: number) => (value >= 3 ? value : null);
const LENGTH: [RegExp, Refine][] = [
  [/(\d+(?:\.\d+)?)\s*(?:lineal|linear)\s*(?:ft|foot|feet)\b/i, (value) => Math.round(value * 0.3048)],
  [/(\d+(?:\.\d+)?)\s*(?:lineal|linear)\s*(?:m\b|metres?|meters?)/i, (value) => value],
  [/(\d+(?:\.\d+)?)\s*(?:lm|l\.m\.)\b/i, (value) => value],
  [/(\d+(?:\.\d+)?)\s?L\b/, (value) => value],
  // "1800 high x 25000 long" - a supplier writing both dimensions in millimetres.
  [/(\d+(?:\.\d+)?)\s*(?:mm|cm|m)?\s*(?:long|wide|in length)\b/i, (value) => value],
  [/(\d+(?:\.\d+)?)\s*m\b(?=[^\n]{0,40}?(?:fenc|run\b))/i, asRun],
  [/(\d+(?:\.\d+)?)\s*(?:odd\s+|approx\.?\s+|or so\s+)?(?:metres?|meters?)\b/i, asRun],
  // Last resort, for a line that never says the word: "post and wire 200m". The floor is what
  // makes it safe - every height on the page is under 3, in metres or otherwise.
  [/(\d+(?:\.\d+)?)\s*m\b/i, asRun],
];
// A rural boundary longer than 500m is mis-read as millimetres; swap for a unit-aware capture if
// one ever shows up.
const asMetres = (value: number | null) => (value !== null && value > 500 ? Math.round(value / 1000) : value);

// The schema's own material slugs, specific before generic - "glass pool fence" is pool_glass,
// not timber_pine, and "merbau" is hardwood rather than the pine everyone defaults to. A document
// that only says "bamboo screening" matches nothing here on purpose: it is not a material anybody
// publishes a rate against, so the agent asks instead of guessing.
const MATERIAL_HINTS: [string, RegExp][] = [
  ['pool_glass', /glass (?:pool )?fenc|frameless|toughened glass/i],
  ['pool_aluminium', /pool fenc|pool panel/i],
  ['colorbond', /colou?rbond/i],
  ['chainmesh', /chain ?(?:mesh|wire|link)|security fenc/i],
  ['aluminium', /alumin(?:i)?um|slat fenc|powder ?coat/i],
  ['rural_wire', /rural fenc|post and wire|farm fenc|paddock|stock fence|ringlock/i],
  ['timber_hardwood', /hardwood|merbau|spotted gum|jarrah|ironbark/i],
  ['timber_pine', /treated pine|\bpine\b|timber|paling/i],
];

// Any line about getting rid of what is already there. "Disposal of 25m of old fence" is the
// removal being quoted for, and missing it is what made the agent ask a question the document had
// already answered.
const REMOVAL: RegExp[] = [
  /\b(?:dispos\w*|remov\w*|demoli\w*|demo|dismantl\w*|tear\s*(?:down|out)|pull\s*(?:down|out)|take\s*away|cart\s*away|strip\s*out|rip\s*out)\b[^.\n]{0,60}fenc/gi,
  // Said the other way round: "Existing 25m paling fence to be dismantled and taken to tip".
  /\b(?:old|existing|current)\b[^.\n]{0,30}?fenc\w*[^.\n]{0,40}?\b(?:remov\w*|dispos\w*|demoli\w*|dismantl\w*|pulled|taken|carted|tip)\b/gi,
];
// "no disposal of the old fence" prices a demolition nobody asked for.
const NEGATED = /\b(?:no|not|excl\w*|without|nil)\b[^.\n]{0,24}$/i;

// What the OLD fence is made of, which is a different question from what the new one will be -
// timber fences are routinely replaced with Colorbond. Businesses price removal against
// core.removes (timber / metal / any), so only those two words are worth reading.
const REMOVES: [DocFacts['removal'], RegExp][] = [
  ['timber', /\b(?:timber|paling|wooden|hardwood|pine)\b[^.\n]{0,30}\bfenc/i],
  ['timber', /\bfenc\w*[^.\n]{0,30}\b(?:timber|paling|wooden)\b/i],
  ['metal', /\b(?:colou?rbond|steel|metal|alumin(?:i)?um|chain ?(?:mesh|wire|link)|wire)\b[^.\n]{0,30}\bfenc/i],
  ['metal', /\bfenc\w*[^.\n]{0,30}\b(?:colou?rbond|steel|metal|chain ?mesh)\b/i],
];

// Site conditions, in the schema's own vocabulary. Replaces the old easy/difficult access
// question outright: the business record prices sloped / rock / restricted_access / hand_dig
// separately, and has no way to charge for "difficult" as such.
const CONDITION_HINTS: [string, RegExp][] = [
  ['sloped', /\bslop\w*|\bfall\b|steep|gradient|uneven ground/i],
  ['rock', /\brock\w*|\bshale\b|bluestone|basalt|hard ground/i],
  [
    'restricted_access',
    /\b(?:tight|difficult|restricted|limited|poor|narrow)\s+(?:site\s+|side\s+)?access\b|\baccess\b[^\n:]{0,20}[:\-–]\s*(?:is\s+)?(?:difficult|hard|tight|restricted|limited|poor)\b/i,
  ],
  ['hand_dig', /hand ?dig|hand ?excavat|no machine access|dig by hand/i],
];
// A document that states easy access has said something real: there is nothing tricky here.
const EASY_ACCESS =
  /\baccess\b[^\n:]{0,20}[:\-–]\s*(?:is\s+)?easy\b|\b(?:easy|clear|good|open|unrestricted)\s+(?:site\s+)?access\b|\bflat\s+and\s+clear\b/i;

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

// The contractor's own address is on the page too, usually at the top, and suggesting it would
// send the job to whichever suburb the fencer trades from.
const LETTERHEAD = /\b(?:abn|acn|pty|ltd|p\/l|phone|mobile|email|www\.|@|fencing|fences|landscap|constructions?|quotation|invoice|tax invoice)\b/i;

function readAddress(text: string): string | null {
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
      if (LETTERHEAD.test(text.slice(lineStart, lineEnd))) continue;
    }
    return line;
  }
  return null;
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

function readDocument(text: string): DocFacts {
  const facts: DocFacts = {};

  const material = MATERIAL_HINTS.find(([, pattern]) => pattern.test(text));
  if (material) facts.material = material[0];

  const heightMm = firstNumber(text, HEIGHT);
  if (heightMm) facts.heightMm = heightMm;

  const lengthMeters = RANGE.some((pattern) => pattern.test(text)) ? null : asMetres(firstNumber(text, LENGTH));
  if (lengthMeters) facts.lengthMeters = lengthMeters;

  // A quote that never mentions an old fence has not said there isn't one, so silence stays
  // unset and the customer gets asked. A removal whose material the page never states is still an
  // unanswered question: businesses price timber and metal differently.
  const removing = REMOVAL.some((pattern) => {
    pattern.lastIndex = 0;
    return [...text.matchAll(pattern)].some((match) => !NEGATED.test(text.slice(Math.max(0, match.index! - 30), match.index)));
  });
  if (removing) {
    const removes = REMOVES.find(([, pattern]) => pattern.test(text));
    if (removes) facts.removal = removes[0]!;
  }

  // Conditions are only ever read as a complete answer, never a partial one. A page that names
  // rock has not ruled out a slope, but it has told us the site is not "nothing tricky", and half
  // an answer here would silently drop a surcharge the business charges for.
  const conditions = CONDITION_HINTS.filter(([, pattern]) => pattern.test(text)).map(([value]) => value);
  if (conditions.length) facts.conditions = conditions;
  else if (EASY_ACCESS.test(text)) facts.conditions = [];

  // The headline the customer means when they say what they were quoted: GST-inclusive, so the
  // largest of them, and never the Subtotal. The '$' is required - without it the "Total" column
  // heading swallows the first line item's quantity instead.
  const totals = [...text.matchAll(/(sub[\s-]*)?total\b[^\n$]{0,16}\$\s?([\d,]+(?:\.\d{1,2})?)/gi)]
    .filter((match) => !match[1])
    .map((match) => Number(match[2]!.replace(/,/g, '')))
    .filter((value) => Number.isFinite(value) && value > 0);
  if (totals.length) facts.existingPrice = Math.max(...totals);

  return facts;
}

export interface AttachmentFacts {
  docFacts: DocFacts;
  docSuburbHint: string | null;
}

/**
 * Reads a single document's worth of transcript. Across several documents, a height off one quote
 * and a total off another describe a job nobody priced - the caller should pass `multipleDocuments:
 * true` in that case, which switches this to a no-op (the agent reads them instead, each one
 * labelled by the router's attachment aggregation).
 */
export function readAttachmentFacts(extractedText: string, multipleDocuments: boolean): AttachmentFacts {
  const text = extractedText.slice(0, 4000);
  if (!text || multipleDocuments) return { docFacts: {}, docSuburbHint: null };
  return { docFacts: readDocument(text), docSuburbHint: readAddress(text) };
}
