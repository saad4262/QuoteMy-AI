import { QUESTIONS, TILING_QUESTIONS } from '../messages.js';
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

/** Only ask this field when the dependency holds - the data form of "no gates means no quantity". */
export interface DependsOn {
  field: string;
  equals?: string;
  notEquals?: string;
}

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
}

export const DEFAULT_PAGE_SIZE = 3;

/**
 * Fencing, exactly as the code behaves today. Every value here is lifted from where it already
 * lives - `vocab.ts`, `formatResult.ts` and `messages.ts` - and `tests/unit/fieldSpec.test.ts`
 * checks it against those originals rather than against a second hand-written copy.
 */
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
  },
  {
    key: 'removal',
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
  },
  {
    key: 'conditions',
    namedBy: /\b(conditions?|site|ground|slope|sloped|access)\b/i,
    aliases: ['conditions'],
    type: 'multiEnum',
    labelGroup: 'conditions',
    title: 'Site conditions',
    question: QUESTIONS.conditions,
    source: 'core.conditions',
    pinned: { label: 'Nothing tricky', value: 'none' },
  },
  {
    key: 'gateType',
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
  },
  {
    key: 'areaSqm',
    namedBy: /\b(areas?|square met(?:re|er)s?|sqm|m2|size)\b/i,
    aliases: ['area', 'sqm', 'metres', 'meters'],
    type: 'number',
    title: 'Area',
    question: TILING_QUESTIONS.areaSqm,
    labelUnit: { suffix: 'm²' },
    /* No list, for the same reason fencing's length has none: it is a number the customer's own
       room already has, and offering 10, 20, 30 would only invite them to round it. */
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
  },
  {
    key: 'removal',
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
  },
  {
    key: 'waterproofing',
    namedBy: /\b(waterproof(?:ing)?|membrane|tanking)\b/i,
    aliases: ['waterproofing'],
    type: 'enum',
    title: 'Waterproofing',
    question: TILING_QUESTIONS.waterproofing,
    source: 'core.waterproof',
    labelGroup: 'waterproof',
    pinned: { label: 'Not needed', value: 'none' },
  },
  {
    key: 'conditions',
    type: 'multiEnum',
    title: 'Site conditions',
    question: TILING_QUESTIONS.conditions,
    source: 'core.conditions',
    labelGroup: 'conditions',
    pinned: { label: 'Nothing tricky', value: 'none' },
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
