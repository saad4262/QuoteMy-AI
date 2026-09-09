import { KITCHEN_QUESTIONS, QUESTIONS, TILING_QUESTIONS } from '../messages.js';
import type { Trade } from '../vocab.js';
import { HEIGHT_FALLBACK, QUANTITIES } from './vocab.js';

/**
 * What a trade's checklist is made of: which fields exist, what order they are asked in, where each
 * one's answers come from, and what has to be true before a field is asked at all.
 *
 * Today this is compiled. `docs/DYNAMIC-SCHEMA-PLAN.md` moves it into `schema/{trade}` so that a
 * new trade is a Firestore document rather than a code change - but the TYPES stay here on purpose.
 * A published document selects from this closed set; it can never invent a new one. That is the
 * same reasoning as the closed vocabulary itself (`CONTEXT.md` §8): the one failure in this system
 * that is silent and permanent is a value nothing in code knows how to handle.
 */

/**
 * `measure` and `number` look alike and are not. A measure keys a rate table, so it is normalised
 * to the exact form businesses publish against - "1800mm", "6ft" and "1.8 m" must all land on
 * "1.8m" or they are four different misses against one entry. A number is a raw quantity that goes
 * into arithmetic, and normalising it would be wrong.
 */
export type FieldType = 'place' | 'enum' | 'multiEnum' | 'measure' | 'number' | 'count' | 'money';

export const FIELD_TYPES: readonly FieldType[] = ['place', 'enum', 'multiEnum', 'measure', 'number', 'count', 'money'];

/** The "there is none of this" answer, always shown last before Other and never paged away. */
export interface PinnedOption {
  label: string;
  value: string;
}

/**
 * The difference between an answer and a phrase.
 *
 * "Yes, take it away" is the right thing to offer somebody being asked whether there is an old
 * fence, and the wrong thing to read back: "removing the old yes, take it away". So the recap can
 * substitute a word for an answer whose label is phrased as an answer, and can put words in front
 * of it or count it by another field.
 */
export interface RecapPhrasing {
  /** Words in front: "removing the old timber fence". */
  prefix?: string;
  /** Another field's answer as a multiplier: "2 x single pedestrian gate". */
  countedBy?: string;
  /** Lower-cased, so it reads inside a sentence rather than as a heading. */
  lower?: boolean;
  /** A word to use instead of that answer's own label, per value. */
  words?: Record<string, string>;
}

/** Only ask this field when the dependency holds - the data form of "no gates means no quantity". */
export interface DependsOn {
  field: string;
  equals?: string;
  notEquals?: string;
}

/**
 * A captured number turned into the field's own unit, or null when this match is not an answer -
 * "12 feet" is a height in inches-and-feet and a length in nothing at all.
 */
export type Refine = (value: number, match: RegExpMatchArray) => number | null;

/**
 * How this field is read off an ATTACHED DOCUMENT - a quote, a price list, a photo of one.
 *
 * This is the trade-specific half of `attachmentFacts.ts`. It lives here, beside the field it reads,
 * for the same reason the pricing formula lives in `TRADE_PRICING` rather than in three copies: the
 * reading is one algorithm and only the patterns differ, so the patterns are data and the algorithm
 * is code. A twentieth trade then needs hints, not a file.
 *
 * Regular expressions rather than a published string: `firestore.store.ts` drops a RegExp from a
 * published schema and `structurallyUsable` merges the published document back onto the compiled
 * spec, which is where these still live - exactly the arrangement `namedBy` already relies on.
 */
export type DocHints =
  | {
      /**
       * Slug to pattern, and ORDER MATTERS: specific before generic, because an `enum` takes the
       * first match. A `multiEnum` collects every one that fires instead.
       */
      values: [string, RegExp][];
      /**
       * `multiEnum` only. The page has stated there is none of this - "Access: easy" - which is a
       * real, EMPTY answer and not the silence of a page that never said.
       */
      none?: RegExp;
      /**
       * Read nothing unless one of these fires first. Two-stage questions need it: what the old
       * fence is made of is only worth reading once the page says an old fence is coming out at all.
       */
      requires?: RegExp[];
      /** ...and not when this sits just before that match: "no disposal of the old fence". */
      negatedBy?: RegExp;
    }
  | {
      /** `number` and `measure`: tried in order, and the first plausible one wins. */
      quantity: [RegExp, Refine][];
      /**
       * Shapes that are not one answer. A range is the case: its midpoint and both ends are three
       * different inventions, so nothing is read and the customer is asked - the same refusal
       * `measureFrom` makes on a typed answer.
       */
      refuse?: RegExp[];
      /** Last pass over whatever survived, for a unit the patterns cannot tell apart. */
      then?: (value: number | null) => number | null;
    };

export interface FieldSpec {
  key: string;
  type: FieldType;
  /** What the field is called on screen: the brief panel, and the "which one?" correction turn. */
  title?: string;
  /** Falls back to the trade's published `questions` map first - see `questionFor`. */
  question?: string;
  /** Dotted path into the trade schema, e.g. `core.materials`. The trade's own vocabulary. */
  source?: string;
  /**
   * Which of the trade's label maps turns this field's values into words - `labels.materials` for
   * fencing's material. Without one the value is title-cased, which is right for a field whose
   * answers are numbers and wrong for one whose answers are slugs.
   */
  labelGroup?: string;
  /**
   * How a value with no label map is read back: `{ suffix: 'm' }` gives "20m", and
   * `{ one: 'gate', many: 'gates' }` gives "1 gate" / "2 gates". A measure that already carries
   * its unit in the value ("1.8m") needs neither.
   */
  labelUnit?: { suffix?: string; one?: string; many?: string };
  /**
   * The unit this field is STORED in, when a customer might reasonably answer in another one.
   *
   * Set it and the answer is converted into this unit before it is kept - "3 by 4 metres" and "100
   * sq ft" become square metres, in code. Leave it off and the answer is taken as a plain number,
   * which is right for a count or a price.
   */
  measureIn?: 'm2' | 'm';
  /**
   * How a customer NAMES this field when they say which answer is wrong - "no, the height's wrong",
   * "can I redo the length". Phrases, matched as written.
   */
  namedBy?: RegExp;
  /**
   * The same thing in single words, matched with the typo tolerance everything else the customer
   * types gets: "lenght" was the one that sent somebody back to an unchanged recap with no way
   * forward. Only unmistakable words belong here - "fence" and "type" are in half of what anyone
   * writes, and a false match empties a field they never mentioned.
   */
  aliases?: string[];
  /**
   * How this field reads inside the one-line recap of the whole job, before the customer confirms.
   * `false` keeps it out entirely - a gate quantity is already inside the gate's own phrase.
   *
   * Absent means "the label, as it is": "Colorbond", "1.8m", "20m".
   */
  recap?: false | RecapPhrasing;
  /** A literal list, for anything no business publishes rates against: a length, a count. */
  options?: (string | number)[];
  pinned?: PinnedOption;
  pageSize?: number;
  dependsOn?: DependsOn;
  /** False = merged and validated like any other field, but never asked. */
  asked?: boolean;
  /**
   * This field's published options are a map keyed by another field's answer, so it has no list at
   * all until that answer exists. Fencing heights are the case: a trade whose heights differ by
   * material publishes `core.heights` as `{ colorbond: [...], timber_pine: [...] }`.
   */
  optionsKeyedBy?: string;
  /**
   * One option is not a question - fill it in rather than asking. Deliberately opt-in: for a field
   * with a pinned "none of this" answer, a single real choice still needs asking, because "none"
   * is a genuine answer to it.
   */
  fillWhenSingle?: boolean;
  /**
   * `enum` only. A material a single business offers has no slug in the trade vocabulary and is
   * deliberately absent from the choice list - most businesses cannot do it, and putting one there
   * pushes out something everybody sells. A customer who names one by hand is naming something
   * real, so it is still recognised. See `mergeAndDecide.ts:18-26`.
   */
  acceptsExtras?: boolean;
  /**
   * How an attached document is read for this field. Absent means it is never read off one - which
   * is the right default: a field with no hints is asked, and asking is always safe.
   */
  docHints?: DocHints;
  /**
   * What the reader files this field's answer under, when that is not `key`.
   *
   * Only fencing's height uses it. That field is stored as a normalised key ("1.8m") but read off a
   * document as raw millimetres, so it has always travelled as `heightMm` - both `mergeAndDecide`
   * and the briefing handed to the model know it by that name. Renaming it would be a change to
   * what the model reads, which is exactly what this refactor promised not to do.
   */
  docKey?: string;
}

export const DEFAULT_PAGE_SIZE = 3;

/**
 * Fencing, exactly as the code behaves today. Every value here is lifted from where it already
 * lives - `vocab.ts`, `formatResult.ts` and `messages.ts` - and `tests/unit/fieldSpec.test.ts`
 * checks it against those originals rather than against a second hand-written copy.
 */
/* The conversions fencing's document hints are written in. They are the trade's own conventions -
   what counts as a height, what counts as a run - so they sit with its fields rather than with the
   reader, which knows nothing about fences. All four are lifted unchanged from `attachmentFacts.ts`. */

// Heights arrive as metres, centimetres or millimetres and the three ranges barely overlap: under
// 10 was metres, 10-300 was centimetres (nothing is a 150mm fence, while a 150cm one is
// standard), above 300 is already millimetres.
const toMm: Refine = (value) => (value < 10 ? Math.round(value * 1000) : value <= 300 ? Math.round(value * 10) : Math.round(value));

// Longest unit spelling first, so "1.8 metres high" doesn't stop at the "m".
const UNIT = '(?:millimetres?|millimeters?|centimetres?|centimeters?|metres?|meters?|mm|cm|m)';

// A "1.8m" sitting on the page is the height, and nobody books a two metre run of fence.
const asRun: Refine = (value) => (value >= 3 ? value : null);

// A rural boundary longer than 500m is mis-read as millimetres; swap for a unit-aware capture if
// one ever shows up.
const asMetres = (value: number | null) => (value !== null && value > 500 ? Math.round(value / 1000) : value);

export const FENCING_FIELDS: FieldSpec[] = [
  {
    key: 'suburb',
    namedBy: /\b(suburbs?|subrubs?|surburbs?|suberbs?|locations?|addresse?s?|areas?|post ?codes?)\b/i,
    aliases: ['suburb', 'location', 'postcode'],
    type: 'place',
    title: 'Suburb',
    question: 'Which suburb is the fence going in? A postcode works too.',
  },
  {
    key: 'material',
    namedBy: /\b(materials?|fence type|type of fence|kind of fence|fencing type)\b/i,
    aliases: ['material'],
    type: 'enum',
    labelGroup: 'materials',
    title: 'Material',
    question: QUESTIONS.material,
    source: 'core.materials',
    acceptsExtras: true,
    /* Specific before generic - "glass pool fence" is pool_glass, not timber_pine, and "merbau" is
       hardwood rather than the pine everyone defaults to. A document that only says "bamboo
       screening" matches nothing here on purpose: it is not a material anybody publishes a rate
       against, so the customer is asked instead of guessed at. */
    docHints: {
      values: [
        ['pool_glass', /glass (?:pool )?fenc|frameless|toughened glass/i],
        ['pool_aluminium', /pool fenc|pool panel/i],
        ['colorbond', /colou?rbond/i],
        ['chainmesh', /chain ?(?:mesh|wire|link)|security fenc/i],
        ['aluminium', /alumin(?:i)?um|slat fenc|powder ?coat/i],
        ['rural_wire', /rural fenc|post and wire|farm fenc|paddock|stock fence|ringlock/i],
        ['timber_hardwood', /hardwood|merbau|spotted gum|jarrah|ironbark/i],
        ['timber_pine', /treated pine|\bpine\b|timber|paling/i],
      ],
    },
  },
  {
    key: 'heightKey',
    namedBy: /\b(heights?|tall|high)\b/i,
    aliases: ['height'],
    type: 'measure',
    title: 'Height',
    question: QUESTIONS.heightKey,
    // Not published by `syncTradeSchema` today, so the literal list below is what is normally used.
    source: 'core.heights',
    options: [...HEIGHT_FALLBACK],
    optionsKeyedBy: 'material',
    fillWhenSingle: true,
    /* Read as raw millimetres and normalised to a rate-table key ("1.8m") downstream by `validate`,
       which is why this one field files under a different name - see `docKey`.
       Capital H is the trade's own suffix ("1.8H" is a height) and is matched case-sensitively on
       purpose - a lowercase h is just the start of a word. */
    docKey: 'heightMm',
    docHints: {
      quantity: [
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
      ],
    },
  },
  {
    key: 'lengthMeters',
    namedBy: /\b(lengths?|long|met(?:re|er)s?)\b/i,
    aliases: ['length', 'metres', 'meters'],
    type: 'number',
    labelUnit: { suffix: 'm' },
    title: 'Length',
    question: QUESTIONS.lengthMeters,
    /* No list. Ten, fifteen, twenty were three guesses at a number the customer already knows, and
       a fence is whatever length the boundary is - nobody's is 10m because we offered 10m. They
       type it, which is one action either way, and it is right rather than near. */
    /* Explicit shorthand first; the loose ones carry `asRun`'s 3m floor. "20 to 30 metres" is not an
       answer at all - the rate is charged per metre, so a span prices a job nobody described, and
       reading nothing lets the customer be asked which it is. */
    docHints: {
      refuse: [
        /\b\d{1,4}(?:\.\d+)?\s*(?:m\b|metres?|meters?)?\s*(?:-|–|—|to)\s*\d{1,4}(?:\.\d+)?\s*(?:m\b|lm\b|lineal|metres?|meters?)/i,
        /\bbetween\s+\d{1,4}[^\n]{0,14}?\d{1,4}\s*(?:m\b|lm\b|lineal|metres?|meters?)/i,
      ],
      quantity: [
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
      ],
      then: asMetres,
    },
  },
  {
    key: 'removal',
    recap: { prefix: 'removing the old ', lower: true, words: { any: 'fence' } },
    namedBy: /\b(removals?|remove|removing|old fence)\b/i,
    aliases: ['removal', 'removing'],
    type: 'enum',
    labelGroup: 'removes',
    title: 'Old fence',
    question: QUESTIONS.removal,
    source: 'core.removes',
    pinned: { label: 'Nothing to remove', value: 'none' },
    /* Two slots, and the pinned "Nothing to remove" is one of them - so the question reads the way
       it is written: yes against no, and nothing else. Timber and metal follow on the next page for
       anyone who wants to be exact, and a typed "the old one is timber" still resolves to them. */
    pageSize: 2,
    /* Two stages. `requires` asks whether a removal is being quoted for at all - "Disposal of 25m of
       old fence" - because a quote that never mentions an old fence has not said there isn't one,
       and silence must stay silence so the customer is asked. `values` then reads what is coming
       out, which is a different question from what is going in: timber fences are routinely replaced
       with Colorbond, and businesses price the two removals differently. */
    docHints: {
      requires: [
        /\b(?:dispos\w*|remov\w*|demoli\w*|demo|dismantl\w*|tear\s*(?:down|out)|pull\s*(?:down|out)|take\s*away|cart\s*away|strip\s*out|rip\s*out)\b[^.\n]{0,60}fenc/gi,
        // Said the other way round: "Existing 25m paling fence to be dismantled and taken to tip".
        /\b(?:old|existing|current)\b[^.\n]{0,30}?fenc\w*[^.\n]{0,40}?\b(?:remov\w*|dispos\w*|demoli\w*|dismantl\w*|pulled|taken|carted|tip)\b/gi,
      ],
      // "no disposal of the old fence" prices a demolition nobody asked for.
      negatedBy: /\b(?:no|not|excl\w*|without|nil)\b[^.\n]{0,24}$/i,
      values: [
        ['timber', /\b(?:timber|paling|wooden|hardwood|pine)\b[^.\n]{0,30}\bfenc/i],
        ['timber', /\bfenc\w*[^.\n]{0,30}\b(?:timber|paling|wooden)\b/i],
        ['metal', /\b(?:colou?rbond|steel|metal|alumin(?:i)?um|chain ?(?:mesh|wire|link)|wire)\b[^.\n]{0,30}\bfenc/i],
        ['metal', /\bfenc\w*[^.\n]{0,30}\b(?:colou?rbond|steel|metal|chain ?mesh)\b/i],
      ],
    },
  },
  {
    key: 'conditions',
    recap: { lower: true },
    namedBy: /\b(conditions?|site|ground|slope|sloped|access)\b/i,
    aliases: ['conditions'],
    type: 'multiEnum',
    labelGroup: 'conditions',
    title: 'Site conditions',
    question: QUESTIONS.conditions,
    source: 'core.conditions',
    pinned: { label: 'Nothing tricky', value: 'none' },
    /* The schema's own vocabulary, which replaced an easy/difficult access question outright: a
       business prices sloped / rock / restricted_access / hand_dig separately and has no way to
       charge for "difficult" as such. `none` is a page that states easy access - that has said
       something real, and it is an EMPTY answer rather than the silence of a page that never said. */
    docHints: {
      values: [
        ['sloped', /\bslop\w*|\bfall\b|steep|gradient|uneven ground/i],
        ['rock', /\brock\w*|\bshale\b|bluestone|basalt|hard ground/i],
        [
          'restricted_access',
          /\b(?:tight|difficult|restricted|limited|poor|narrow)\s+(?:site\s+|side\s+)?access\b|\baccess\b[^\n:]{0,20}[:\-–]\s*(?:is\s+)?(?:difficult|hard|tight|restricted|limited|poor)\b/i,
        ],
        ['hand_dig', /hand ?dig|hand ?excavat|no machine access|dig by hand/i],
      ],
      none: /\baccess\b[^\n:]{0,20}[:\-–]\s*(?:is\s+)?easy\b|\b(?:easy|clear|good|open|unrestricted)\s+(?:site\s+)?access\b|\bflat\s+and\s+clear\b/i,
    },
  },
  {
    key: 'gateType',
    recap: { countedBy: 'gateQty', lower: true },
    namedBy: /\b(gate type|type of gate|kind of gate|which gate)\b/i,
    type: 'enum',
    labelGroup: 'gateTypes',
    title: 'Gate',
    question: QUESTIONS.gateType,
    source: 'core.gateTypes',
    pinned: { label: 'No gates', value: 'none' },
  },
  {
    key: 'gateQty',
    /* Already inside the gate's own phrase - "2 x single pedestrian gate" - so saying it twice
       would read as two separate answers. */
    recap: false,
    namedBy: /\b(how many gates|number of gates|gate count)\b/i,
    type: 'count',
    labelUnit: { one: 'gate', many: 'gates' },
    /* Not "Gates". It sits directly under "Gate" in the brief panel, and two labels one letter
       apart is not a distinction anybody reads - especially greyed out, before either has a value. */
    title: 'Number of gates',
    question: QUESTIONS.gateQty,
    options: [...QUANTITIES],
    dependsOn: { field: 'gateType', notEquals: 'none' },
  },
  {
    key: 'existingPrice',
    type: 'money',
    asked: false,
  },
];

/**
 * Tiling, from the client's SOP.
 *
 * Eight asked fields, the same count as fencing, and the SOP's own §26 list of what its assistant
 * must ask is what they are: measurements, tile type, who supplies the tile, whether demolition is
 * needed, substrate condition, waterproofing, access.
 *
 * `jobType` leads because in this trade the room IS the job - a bathroom is floor and wall and
 * waterproofing at once, and tilers publish one price for one. `areaSqm` is still asked after it,
 * because plenty of businesses publish only per-square-metre rates and quote the same bathroom by
 * the metre; which way a given business is quoted is decided by the unit on its own rate row.
 */
/**
 * What a quote calls the thing on the floor.
 *
 * Not just "tile": a line about what is coming up names the kind at least as often as the noun -
 * "existing mosaic to be stripped out" never says the word tiles - and a gate that insists on the
 * noun reads that line as saying nothing at all.
 */
const TILE_NOUN = String.raw`(?:tiles?|tiling|ceramics?|porcelain|mosaics?|terrazzo|stone|marble|travertine|slate)`;

/**
 * An area, in the several ways a quote writes one.
 *
 * A rate is written the same way with one difference that does all the work here: a rate has words
 * or a slash between the number and the unit - "$65 per m2", "$65/m2" - while an area has only
 * space. So requiring `\s*` is what keeps this from reading a business's own rate as the size of
 * somebody's floor.
 */
const AREA_UNIT = String.raw`(?:m\s*(?:2|²)|sq\.?\s*m|sqm|square\s+met(?:re|er)s?)`;

/** Words that mean "this one is on its way out", either side of the tile they describe. */
const COMING_UP = String.raw`(?:old|existing|current|remov\w*|strip\w*|demoli\w*|lift\w*)`;
const TAKEN_AWAY = String.raw`(?:remov\w*|strip\w*|demoli\w*|lifted|taken up|come up)`;

/**
 * A tiling quote names two tiles in one breath - "remove existing ceramic, lay porcelain" - and the
 * two fields that read them want opposite halves. `oldTile` is for `removal`, `newTile` for
 * `tileType`, and each has to refuse the other's tile or they both read whichever word came first.
 *
 * Getting this wrong is not a near miss: `tileType` picks the rate row a customer is quoted
 * against, so reading the tile being SKIPPED out of the room quotes a job nobody described.
 */
const oldTile = (word: string): RegExp => {
  // Grouped, because `word` is an alternation for some kinds ("stone|marble|travertine") and an
  // ungrouped one would bind the word boundaries to the first and last branch only.
  const kind = `(?:${word})`;
  return new RegExp(
    `\\b${COMING_UP}\\b[^.\\n]{0,25}\\b${kind}\\b|\\b${kind}\\b[^.\\n]{0,25}\\b${TAKEN_AWAY}\\b`,
    'i',
  );
};

/**
 * Where the sentence stops being about the old tile and starts being about the new one.
 *
 * Distance alone cannot tell them apart, and trying was the bug: in "remove existing ceramic tiles
 * and lay porcelain" the word "existing" sits 23 characters before "porcelain", so any window wide
 * enough to catch a real removal also caught the tile going down. What actually separates them is a
 * conjunction or a laying verb - the point where a new clause begins.
 */
const NEW_CLAUSE = String.raw`(?:\b(?:and|then|with|lay|laying|laid|install\w*|fix|fixed|new|replac\w*|suppl\w*)\b|[,;])`;

/** Up to 25 characters that stay inside one clause. */
const SAME_CLAUSE = String.raw`(?:(?!${NEW_CLAUSE})[^.\n]){0,25}`;

/**
 * The tile GOING DOWN: anything the page names that is not sitting in a clause about taking a tile
 * up. The two lookarounds are the whole of it - one refuses "remove existing <tile>", the other
 * refuses "<tile> to be stripped out" - and both stop at the first conjunction, so the tile on the
 * far side of an "and lay" is read as what it is.
 */
const newTile = (body: string): RegExp =>
  new RegExp(
    `(?<!\\b${COMING_UP}\\b${SAME_CLAUSE})(?:${body})(?!${SAME_CLAUSE}\\b${TAKEN_AWAY}\\b)`,
    'i',
  );

/**
 * A tile size, written the several ways a quote writes one: "600x1200", "600 x 1200mm", "1200X600".
 *
 * Both orders, because a supplier writes the long side first as often as not and "1200x600" is the
 * same tile as "600x1200". The lookahead is what stops 600x1200 matching inside 600x12000.
 */
const tileSize = (a: number, b: number): RegExp =>
  newTile(String.raw`\b(?:${a}\s*[x×]\s*${b}|${b}\s*[x×]\s*${a})(?:\s*mm)?(?!\d)`);

export const TILING_FIELDS: FieldSpec[] = [
  {
    key: 'suburb',
    namedBy: /\b(suburbs?|subrubs?|surburbs?|suberbs?|locations?|addresse?s?|areas?|post ?codes?)\b/i,
    aliases: ['suburb', 'location', 'postcode'],
    type: 'place',
    title: 'Suburb',
    question: 'Which suburb is the job in? A postcode works too.',
  },
  {
    key: 'jobType',
    namedBy: /\b(jobs?|rooms?|bathrooms?|splashbacks?|what.{0,12}tiled)\b/i,
    aliases: ['job', 'room'],
    type: 'enum',
    title: 'Job',
    question: TILING_QUESTIONS.jobType,
    source: 'core.jobTypes',
    labelGroup: 'jobTypes',
    /* ROOMS FIRST, surfaces last, and that order is the whole rule: in this trade the room IS the
       job - a bathroom is floor and wall and waterproofing at once, and tilers publish one price
       for one. So "bathroom floor and wall retile" is a bathroom, not a floor; `floor_only` and
       `wall_only` are what a job is when no room was named at all ("floor tiling to the living
       area"). First-match-wins gives that for free, with no code to say it.
       `ensuite` sits above `bathroom` for the same reason: an ensuite is the more specific room. */
    docHints: {
      values: [
        ['ensuite', /\bensuites?\b/i],
        ['bathroom', /\bbathrooms?\b|\bwet\s?rooms?\b/i],
        ['laundry', /\blaundr(?:y|ies)\b/i],
        ['kitchen_splashback', /\bsplash\s?backs?\b|\bkitchen\b[^.\n]{0,20}\btil/i],
        ['balcony', /\bbalcon(?:y|ies)\b|\bterraces?\b/i],
        ['outdoor', /\boutdoors?\b|\balfresco\b|\bpatios?\b|\bverandah?s?\b/i],
        ['floor_only', /\bfloors?\b|\bflooring\b/i],
        ['wall_only', /\bwalls?\b/i],
      ],
    },
  },
  {
    key: 'tileType',
    namedBy: /\b(tiles?|tile type|type of tile|kind of tile)\b/i,
    aliases: ['tile'],
    type: 'enum',
    title: 'Tile',
    question: TILING_QUESTIONS.tileType,
    source: 'core.tileTypes',
    labelGroup: 'tileTypes',
    acceptsExtras: true,
    /* Sizes first, because a size IS the tile here: a business publishes a large-format rate and a
       porcelain rate as two different rows, so "600x600 porcelain" is the large-format one and
       reading it as porcelain quotes the wrong price. After the sizes, specific before generic -
       outdoor porcelain above porcelain, the named mosaics above mosaic, and ceramic last because
       it is the word a quote falls back on. */
    docHints: {
      values: [
        ['large_format_1200x2400', tileSize(1200, 2400)],
        ['large_format_1200x1200', tileSize(1200, 1200)],
        ['large_format_900x900', tileSize(900, 900)],
        ['large_format_800x800', tileSize(800, 800)],
        ['large_format_600x1200', tileSize(600, 1200)],
        ['large_format_600x600', tileSize(600, 600)],
        ['herringbone', newTile(String.raw`\bherringbone\b|\bchevron\b`)],
        ['terrazzo', newTile(String.raw`\bterrazzo\b`)],
        ['glass_mosaic', newTile(String.raw`\bglass\s+mosaics?\b`)],
        ['feature_mosaic', newTile(String.raw`\bfeature\s+(?:mosaics?|tiles?)\b|\bkit\s?kat\b|\bpenny\s+rounds?\b`)],
        ['subway', newTile(String.raw`\bsubway\b|\bmetro\s+tiles?\b`)],
        ['mosaic', newTile(String.raw`\bmosaics?\b`)],
        [
          'natural_stone',
          newTile(String.raw`\bnatural\s+stone\b|\bmarble\b|\btravertine\b|\bgranite\b|\blimestone\b|\bbluestone\b|\bslate\b`),
        ],
        // Only when it says so. "Porcelain to the balcony" is porcelain; guessing otherwise would
        // move them onto a rate their quote never mentioned.
        [
          'outdoor_porcelain',
          newTile(String.raw`\b(?:outdoor|external|exterior)\s+porcelain\b|\bporcelain\b[^.\n]{0,15}\b(?:outdoor|external)\b`),
        ],
        ['porcelain', newTile(String.raw`\bporcelain\b`)],
        ['ceramic', newTile(String.raw`\bceramics?\b`)],
      ],
    },
  },
  {
    key: 'areaSqm',
    namedBy: /\b(areas?|square met(?:re|er)s?|sqm|m2|size)\b/i,
    aliases: ['area', 'sqm', 'metres', 'meters'],
    type: 'number',
    title: 'Area',
    question: TILING_QUESTIONS.areaSqm,
    labelUnit: { suffix: 'm²' },
    // People measure a room every way there is - one number, two sides, or in feet. All of them
    // are the same fact, and making somebody do the sum before we will listen to them is not a
    // question, it is a form.
    measureIn: 'm2',
    /* No list, for the same reason fencing's length has none: it is a number the customer's own
       room already has, and offering 10, 20, 30 would only invite them to round it. */
    /* THE refusal that matters in this trade. A fencing quote has one run on it; a tiling quote
       routinely has three areas - "Bathroom 6m2, Laundry 4m2, Kitchen 2m2" - and there is no way to
       tell from the page which one the customer is asking us about. Summing them quotes a job three
       times the size; taking the first quotes a job a third of it; and both look exactly like a
       number the customer gave us by the time they reach a price. So two areas on a page is not an
       answer, and neither is a range: read nothing and let them be asked, which costs one question.
       Same call `measureFrom` already makes on a typed "20-25". */
    docHints: {
      refuse: [
        new RegExp(String.raw`\b\d+(?:\.\d+)?\s*${AREA_UNIT}?\s*(?:-|–|—|to|or)\s*\d+(?:\.\d+)?\s*${AREA_UNIT}`, 'i'),
        // Said the long way round, which no dash catches: "between 20 and 25 square metres".
        new RegExp(String.raw`\bbetween\s+\d+(?:\.\d+)?[^\n]{0,14}?\d+(?:\.\d+)?\s*${AREA_UNIT}`, 'i'),
        new RegExp(String.raw`\d+(?:\.\d+)?\s*${AREA_UNIT}\b[\s\S]*?\d+(?:\.\d+)?\s*${AREA_UNIT}\b`, 'i'),
      ],
      quantity: [
        /* Two sides of a room. The trailing "m" is required and must not be "mm": without that this
           reads the tile size "600 x 1200mm" as a seven-hundred-thousand square metre floor. The
           plausibility cap is the second guard on the same mistake. */
        [
          /(\d+(?:\.\d+)?)\s*m?\s*[x×]\s*(\d+(?:\.\d+)?)\s*m\b(?!m)/i,
          (value, match) => {
            const other = Number(match[2]);
            if (!Number.isFinite(other) || value > 50 || other > 50) return null;
            return Math.round(value * other * 100) / 100;
          },
        ],
        [new RegExp(String.raw`(\d+(?:\.\d+)?)\s*${AREA_UNIT}\b`, 'i'), (value) => value],
      ],
    },
  },
  {
    key: 'supply',
    namedBy: /\b(supply|supplied|who.{0,12}buying|who.{0,12}supplies)\b/i,
    aliases: ['supply'],
    type: 'enum',
    title: 'Tiles',
    question: TILING_QUESTIONS.supply,
    source: 'core.supply',
    labelGroup: 'supply',
    /* Two real answers and no "none" - somebody is buying the tiles either way. */
    pageSize: 2,
    /* `labour_only` first, because it is the qualified statement. "Supply and lay the client's own
       tiles" contains the standard phrase for the other answer, and reading it as `supply_and_install`
       would add a tile price to a quote that was only ever for labour. */
    docHints: {
      values: [
        [
          'labour_only',
          /\blabour\s+only\b|\b(?:client|customer|owner|you)(?:'s)?\s+(?:to\s+|own\s+)?(?:supply|supplies|supplying|provide|provides|tiles?)\b|\btiles?\s+(?:supplied|provided)\s+by\s+(?:client|customer|owner|others)\b|\btiles?\s+by\s+others\b|\bexcludes?\s+(?:the\s+)?tiles?\b/i,
        ],
        ['supply_and_install', /\bsupply\s*(?:and|&|\+)\s*(?:install|lay|fix)\b|\bwe\s+supply\b|\btiles?\s+(?:are\s+)?included\b|\bincludes?\s+(?:the\s+)?tiles?\b/i],
      ],
    },
  },
  {
    key: 'removal',
    recap: { prefix: 'removing the old ', lower: true, words: { any: 'tiles' } },
    namedBy: /\b(removals?|remove|removing|old tiles?|existing tiles?)\b/i,
    aliases: ['removal', 'removing'],
    type: 'enum',
    title: 'Old tiles',
    question: TILING_QUESTIONS.removal,
    source: 'core.removes',
    labelGroup: 'removes',
    pinned: { label: 'Nothing to take up', value: 'none' },
    // Yes against no, the same two-slot layout the fencing removal question uses.
    pageSize: 2,
    /* The same two stages fencing uses: is a removal being quoted for at all, and only then what is
       coming up. Silence stays silence - a quote that never mentions old tiles has not said there
       are none, so the customer is still asked.
       `any` last, and deliberately: it is what a removal reads as when the page says tiles are
       coming up without saying which kind, which is most of the time. `adhesive` is absent on
       purpose - it is a business-side line and is not offered to a customer. */
    docHints: {
      requires: [
        new RegExp(
          String.raw`\b(?:remov\w*|strip\w*|demoli\w*|dispos\w*|lift\w*|take\s*up|taking\s*up|tear\s*up|rip\s*up)\b[^.\n]{0,40}\b${TILE_NOUN}\b`,
          'gi',
        ),
        new RegExp(
          String.raw`\b(?:old|existing|current)\b[^.\n]{0,30}?\b${TILE_NOUN}\b[^.\n]{0,40}?\b(?:remov\w*|strip\w*|demoli\w*|lifted|taken\s*up|come\s*up|out)\b`,
          'gi',
        ),
      ],
      // "no removal of the existing tiles" prices a demolition nobody asked for.
      negatedBy: /\b(?:no|not|excl\w*|without|nil)\b[^.\n]{0,24}$/i,
      values: [
        ['none', /\bno\s+(?:tile\s+)?removal\b|\btiles?\s+to\s+remain\b|\bnothing\s+to\s+(?:take\s*up|remove)\b/i],
        ['ceramic', oldTile('ceramics?')],
        ['porcelain', oldTile('porcelain')],
        ['stone', oldTile('(?:natural\\s+)?stone|marble|travertine|slate')],
        ['mosaic', oldTile('mosaics?')],
        ['any', /\btiles?\b/i],
      ],
    },
  },
  {
    key: 'waterproofing',
    /* The labels are answers - "Yes, the bathroom" - which is right on screen and wrong read back.
       These are the same rooms as nouns. */
    recap: {
      prefix: 'waterproofing ',
      lower: true,
      words: { bathroom: 'the bathroom', shower: 'the shower', ensuite: 'the ensuite', laundry: 'the laundry', balcony: 'the balcony' },
    },
    namedBy: /\b(waterproof(?:ing)?|membrane|tanking)\b/i,
    aliases: ['waterproofing'],
    type: 'enum',
    title: 'Waterproofing',
    question: TILING_QUESTIONS.waterproofing,
    source: 'core.waterproof',
    labelGroup: 'waterproof',
    pinned: { label: 'Not needed', value: 'none' },
    /* `requires` IS this field. Four of its five answers - bathroom, ensuite, laundry, balcony - are
       also `jobType` answers, so without a gate the words "Bathroom retile" would fill in
       waterproofing as well, and every bathroom quote would come back claiming a waterproofing
       answer the page never gave. The gate is the word itself: waterproofing, a membrane, tanking.
       `none` leads, so "waterproofing not included" is read as the answer it is rather than as the
       area sitting next to it. */
    docHints: {
      requires: [/\bwaterproof\w*|\bmembranes?\b|\btanking\b/gi],
      values: [
        [
          'none',
          /\b(?:no|not|nil|excl\w*|without)\b[^.\n]{0,25}(?:waterproof\w*|membranes?|tanking)|(?:waterproof\w*|membranes?|tanking)[^.\n]{0,25}\b(?:not included|excluded|by others|n\/a|not required)\b/i,
        ],
        // Shower before bathroom: a shower is the more specific wet area, and a business prices it
        // as its own line.
        ['shower', /\bshowers?\b/i],
        ['ensuite', /\bensuites?\b/i],
        ['bathroom', /\bbathrooms?\b/i],
        ['laundry', /\blaundr(?:y|ies)\b/i],
        ['balcony', /\bbalcon(?:y|ies)\b/i],
      ],
    },
  },
  {
    key: 'conditions',
    namedBy: /\b(conditions?|site|access|substrate|floor)\b/i,
    aliases: ['conditions'],
    recap: { lower: true },
    type: 'multiEnum',
    title: 'Site conditions',
    question: TILING_QUESTIONS.conditions,
    source: 'core.conditions',
    labelGroup: 'conditions',
    pinned: { label: 'Nothing tricky', value: 'none' },
    /* Tiling's own five, each one a surcharge a business publishes separately - carrying tile up a
       staircase and cutting around a tiny ensuite are different jobs with different prices, and a
       page that names one has said something worth keeping.
       `restricted_access` is the only value fencing also publishes, and before the reader knew
       about trades fencing's hint really did land on tiling briefs. It reads the same here, so
       nothing a tiler was already getting was taken away. */
    docHints: {
      values: [
        [
          'restricted_access',
          /\b(?:tight|difficult|restricted|limited|poor|narrow)\s+(?:site\s+|side\s+)?access\b|\baccess\b[^\n:]{0,20}[:\-–]\s*(?:is\s+)?(?:difficult|hard|tight|restricted|limited|poor)\b/i,
        ],
        // "First floor" is upstairs in Australian usage, and upstairs is what this charges for.
        [
          'second_storey',
          /\b(?:second|2nd|first|1st|upper)\s+(?:stor(?:e?y|ies)|floor|level)\b|\bupstairs\b|\bsecond\s+stor(?:e?y|ies)\b/i,
        ],
        ['stairs', /\bstairs?\b|\bstaircases?\b|\bstairwells?\b|\bsteps\b/i],
        [
          'small_room',
          /\bsmall\s+(?:rooms?|bathrooms?|ensuites?|laundr(?:y|ies)|areas?|spaces?)\b|\bpowder\s+rooms?\b|\bconfined\s+spaces?\b/i,
        ],
        [
          'uneven_substrate',
          /\bunevens?\b|\bout\s+of\s+level\b|\bnot\s+level\b|\bsubstrate\b[^.\n]{0,30}\b(?:level\w*|prep\w*|repair\w*|grind\w*)\b|\b(?:floor\s+)?level(?:ling|led)\b|\bscreed\w*\b|\bself[-\s]?level\w*\b/i,
        ],
      ],
      none: /\baccess\b[^\n:]{0,20}[:\-–]\s*(?:is\s+)?easy\b|\b(?:easy|clear|good|open|unrestricted)\s+(?:site\s+)?access\b|\bflat\s+and\s+clear\b/i,
    },
  },
  {
    key: 'existingPrice',
    type: 'money',
    asked: false,
  },
];

/**
 * Kitchen's seven, and the shape that makes it different from both other trades.
 *
 * There is no quantity question here at all. Fencing asks how many metres and tiling how many
 * square metres; a kitchen fitter prices the whole job by its SIZE, so `kitchenSize` is both the
 * question a customer can actually answer and the key that finds the rate. Everything after it is
 * an itemised addition to that one price.
 */
export const KITCHEN_FIELDS: FieldSpec[] = [
  {
    key: 'suburb',
    namedBy: /\b(suburbs?|subrubs?|surburbs?|suberbs?|locations?|addresse?s?|areas?|post ?codes?)\b/i,
    aliases: ['suburb', 'location', 'postcode'],
    type: 'place',
    title: 'Suburb',
    question: 'Which suburb is the job in? A postcode works too.',
  },
  {
    key: 'jobType',
    namedBy: /\b(jobs?|new kitchen|replacement|what.{0,12}(?:doing|having done))\b/i,
    aliases: ['job'],
    type: 'enum',
    title: 'Job',
    question: KITCHEN_QUESTIONS.jobType,
    source: 'core.jobTypes',
    labelGroup: 'jobTypes',
    /* `install_only` first, and that order is the rule. "Install the kitchen the customer supplies"
       contains the words for the other two, and read the other way round a job with no demolition
       in it gets quoted as a replacement. `replacement` before `new_kitchen` for the same reason:
       "new kitchen replacing the old one" is a replacement, and the word "new" is in both. */
    docHints: {
      values: [
        [
          'install_only',
          /\binstall(?:ation)?\s+only\b|\bcustomer[-\s]?supplied\b|\bowner[-\s]?supplied\b|\bfit\s+(?:only|the\s+customer)\b|\bflat[-\s]?pack\b[^.\n]{0,20}\binstall/i,
        ],
        [
          'replacement',
          /\breplac\w*\b|\bexisting\s+kitchen\b|\bold\s+kitchen\b|\bstrip\s*out\b|\brenovation\b/i,
        ],
        ['new_kitchen', /\bnew\s+kitchen\b|\bnew\s+build\b/i],
      ],
    },
  },
  {
    key: 'kitchenSize',
    namedBy: /\b(sizes?|how big|small|standard|large|layouts?)\b/i,
    aliases: ['size'],
    type: 'enum',
    title: 'Size',
    question: KITCHEN_QUESTIONS.kitchenSize,
    source: 'core.sizes',
    labelGroup: 'sizes',
    /* Layout words before the plain size words, because a layout is what a fitter's list actually
       says and it is the more specific statement: "U-shaped kitchen" is large whatever else the
       page calls it. `standard` last of the three, because it is the word a quote falls back on. */
    docHints: {
      values: [
        ['large', /\blarge\s+kitchen\b|\bu[-\s]?shaped?\b|\bisland\s+kitchen\b|\bpeninsula\b/i],
        ['small', /\bsmall\s+kitchen\b|\bgalley\b|\bsingle\s+run\b|\bstraight\s+kitchen\b/i],
        ['standard', /\b(?:standard|medium)\s+kitchen\b|\bl[-\s]?shaped?\b/i],
      ],
    },
  },
  {
    key: 'supply',
    namedBy: /\b(supply|supplied|who.{0,12}buying|who.{0,12}supplies|cabinets?)\b/i,
    aliases: ['supply', 'cabinets'],
    type: 'enum',
    title: 'Cabinets',
    question: KITCHEN_QUESTIONS.supply,
    source: 'core.supply',
    labelGroup: 'supply',
    /* Two real answers and no "none" - somebody is buying the cabinets either way. */
    pageSize: 2,
    /* `labour_only` first, exactly as in tiling and for the same reason: "supply and install the
       client's own cabinets" contains the standard phrase for the other answer, and reading it as
       `supply_and_install` would add a cabinetry package to a quote that was only ever for fitting.
       This trade makes that mistake more expensive than tiling does - a kitchen package is $8,950
       where a room of tiles is a few hundred. */
    docHints: {
      values: [
        [
          'labour_only',
          /\binstall(?:ation)?\s+only\b|\b(?:client|customer|owner|you)(?:'s)?\s+(?:to\s+|own\s+)?(?:supply|supplies|supplying|provide|provides|cabinets?|kitchen)\b|\bcabinets?\s+(?:supplied|provided)\s+by\s+(?:client|customer|owner|others)\b|\bcabinets?\s+by\s+others\b|\bexcludes?\s+(?:the\s+)?(?:cabinets?|cabinetry)\b/i,
        ],
        [
          'supply_and_install',
          /\bsupply\s*(?:and|&|\+)\s*(?:install|build|fit)\b|\bwe\s+supply\b|\bcabinet(?:ry|s)?\s+(?:are\s+)?included\b|\bincludes?\s+(?:the\s+)?cabinet(?:ry|s)?\b|\bcabinetry\s+package\b/i,
        ],
      ],
    },
  },
  {
    key: 'benchtop',
    recap: { prefix: 'a ', lower: true, words: { laminate: 'laminate benchtop', timber: 'timber benchtop', stone: 'stone benchtop' } },
    namedBy: /\b(bench\s?tops?|benches|counter\s?tops?)\b/i,
    aliases: ['benchtop', 'benchtops'],
    type: 'enum',
    title: 'Benchtop',
    question: KITCHEN_QUESTIONS.benchtop,
    source: 'core.benchtops',
    labelGroup: 'benchtops',
    /* Not blocking, and the pinned answer says so plainly: a fitter who does not install benchtops
       can still fit the kitchen, and a customer who has one already is not asking us to price it. */
    pinned: { label: 'Not needed', value: 'none' },
    /* `requires` IS this field, the same way it is tiling's waterproofing. "Stone" and "timber" are
       words that appear all over a kitchen page - a timber cabinet door, a stone splashback - so
       without the gate a submission naming either would fill in a benchtop nobody quoted. */
    docHints: {
      requires: [/\bbench\s?tops?\b|\bcounter\s?tops?\b/gi],
      values: [
        [
          'none',
          /\b(?:no|not|nil|excl\w*|without)\b[^.\n]{0,25}bench\s?tops?|bench\s?tops?[^.\n]{0,25}\b(?:not included|excluded|by others|n\/a|not required)\b/i,
        ],
        ['stone', /\bstone\b|\bgranite\b|\bengineered\s+stone\b|\bquartz\b|\bcaesarstone\b/i],
        ['timber', /\btimber\b|\bwood(?:en)?\b|\bbutcher\s?block\b/i],
        ['laminate', /\blaminate[sd]?\b|\bmelamine\b/i],
      ],
    },
  },
  {
    key: 'removal',
    recap: { prefix: 'taking out ', lower: true, words: { any: 'the old kitchen', full_demolition: 'the whole old kitchen' } },
    namedBy: /\b(removals?|remove|removing|demolition|old kitchen|existing kitchen|strip ?out)\b/i,
    aliases: ['removal', 'removing', 'demolition'],
    type: 'enum',
    title: 'Old kitchen',
    question: KITCHEN_QUESTIONS.removal,
    source: 'core.removes',
    labelGroup: 'removes',
    pinned: { label: 'Nothing to take out', value: 'none' },
    /* The same two stages both other trades use: is a removal being quoted for at all, and only
       then what is coming out. Silence stays silence - a quote that never mentions the old kitchen
       has not said there is none, so the customer is still asked.
       `any` last, and deliberately: it is what a removal reads as when the page says a kitchen is
       coming out without saying how much of it, which is most of the time. */
    docHints: {
      requires: [
        new RegExp(
          String.raw`\b(?:remov\w*|strip\w*|demoli\w*|dispos\w*|take\s*out|taking\s*out|tear\s*out|rip\s*out)\b[^.\n]{0,40}\b(?:kitchen|cabinet\w*|bench\s?top|splash\s?back)\b`,
          'gi',
        ),
        new RegExp(
          String.raw`\b(?:old|existing|current)\b[^.\n]{0,30}?\b(?:kitchen|cabinet\w*|bench\s?top|splash\s?back)\b[^.\n]{0,40}?\b(?:remov\w*|strip\w*|demoli\w*|taken\s*out|out)\b`,
          'gi',
        ),
        /* The noun before the verb, with nothing in front of it: "Full kitchen demolition" and
           "Cabinet removal" are how a fitter's own price list writes this, and neither says "old"
           or "existing" anywhere. Found by the test, not reasoned about. */
        new RegExp(
          String.raw`\b(?:kitchen|cabinet\w*|bench\s?top|splash\s?back)\b[^.\n]{0,20}\b(?:remov\w*|strip\w*|demoli\w*|dispos\w*)\b`,
          'gi',
        ),
      ],
      // "no removal of the existing kitchen" prices a demolition nobody asked for.
      negatedBy: /\b(?:no|not|excl\w*|without|nil)\b[^.\n]{0,24}$/i,
      values: [
        [
          'none',
          /\bno\s+(?:kitchen\s+)?(?:removal|demolition)\b|\bnothing\s+to\s+(?:take\s*out|remove)\b|\bkitchen\s+to\s+remain\b/i,
        ],
        ['full_demolition', /\bfull\s+(?:kitchen\s+)?demoli\w*|\bcomplete\s+strip\s*out\b|\bwhole\s+kitchen\s+(?:out|removed)\b/i],
        ['benchtop_only', /\bbench\s?top\s+(?:removal|only)\b/i],
        ['splashback_only', /\bsplash\s?back\s+(?:removal|only)\b/i],
        ['cabinets_only', /\bcabinets?\s+(?:removal|only)\b|\bremov\w*\b[^.\n]{0,25}\bcabinets?\b/i],
        ['any', /\bkitchen\b/i],
      ],
    },
  },
  {
    key: 'extras',
    namedBy: /\b(extras?|islands?|pantr(?:y|ies)|splash\s?backs?|appliances?|sinks?|laundr(?:y|ies))\b/i,
    aliases: ['extras'],
    recap: { lower: true },
    type: 'multiEnum',
    title: 'Extras',
    question: KITCHEN_QUESTIONS.extras,
    source: 'core.extras',
    labelGroup: 'extras',
    pinned: { label: 'Nothing else', value: 'none' },
    /* In this trade the extras are most of the quote, so a page that names one has said something
       worth keeping. No `none` pattern: a kitchen list that simply does not mention an island has
       not said there is no island, and the customer is asked. */
    docHints: {
      values: [
        ['island', /\bislands?\b/i],
        ['pantry', /\bpantr(?:y|ies)\b/i],
        ['splashback_prep', /\bsplash\s?backs?\b/i],
        [
          'appliance_integration',
          /\bappliances?\b|\bdishwashers?\b|\bovens?\b|\bcook\s?tops?\b|\brange\s?hoods?\b|\bintegrated\b/i,
        ],
        ['sink', /\bsinks?\b/i],
        ['laundry', /\blaundr(?:y|ies)\b/i],
      ],
    },
  },
  {
    key: 'existingPrice',
    type: 'money',
    asked: false,
  },
];

/**
 * Each trade's checklist, by trade. Read by anything that serves a trade generically - the chat's
 * fallback schema and the Firestore seed - so that publishing `schema/tiling` cannot seed it with
 * fencing's questions.
 */
export const TRADE_FIELDS: Record<Trade, FieldSpec[]> = {
  fencing: FENCING_FIELDS,
  tiling: TILING_FIELDS,
  kitchen: KITCHEN_FIELDS,
};

/** Every spec entry, asked or not. */
export const specOf = (fields: FieldSpec[], key: string): FieldSpec | undefined => fields.find((f) => f.key === key);

/** The fields a customer is actually asked, in the order they are asked in. */
export const askedFields = (fields: FieldSpec[]): FieldSpec[] => fields.filter((f) => f.asked !== false);

/**
 * How a published field spec differs from the compiled one.
 *
 * Differing is allowed - it is the entire point of publishing it. `CONTEXT.md` §8's warning is that
 * vocabulary drift is the one failure here that is silent and permanent, and the same holds for the
 * checklist: a question quietly dropped is not an error anywhere, it is just a field nobody is ever
 * asked about. This is what stops it being silent.
 *
 * Pure so it can be tested without Firestore; the caller decides how loudly to say it.
 */
export interface FieldDrift {
  /** In code, not in the published document - a question this trade will now never ask. */
  dropped: string[];
  /** In the document, not in code - normal for a trade code has never heard of. */
  added: string[];
  /** Names a type nothing can execute. The document is refused at load; this says so at boot. */
  unknownTypes: string[];
}

export function describeFieldDrift(compiled: FieldSpec[], published: unknown): FieldDrift | null {
  if (!Array.isArray(published) || !published.length) return null;

  const keyOf = (entry: unknown): string => {
    const key = (entry as FieldSpec | null)?.key;
    return typeof key === 'string' ? key : '';
  };

  const publishedKeys = new Set(published.map(keyOf).filter(Boolean));
  const compiledKeys = new Set(compiled.map((spec) => spec.key));

  const drift: FieldDrift = {
    dropped: [...compiledKeys].filter((key) => !publishedKeys.has(key)),
    added: [...publishedKeys].filter((key) => !compiledKeys.has(key)),
    unknownTypes: published
      .filter((entry) => !FIELD_TYPES.includes((entry as FieldSpec | null)?.type as FieldType))
      .map((entry) => keyOf(entry) || '(no key)'),
  };

  return drift.dropped.length || drift.added.length || drift.unknownTypes.length ? drift : null;
}
