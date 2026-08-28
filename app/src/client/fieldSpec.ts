import { QUESTIONS } from '../messages.js';
import { HEIGHT_FALLBACK, LENGTHS, QUANTITIES } from './vocab.js';

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
    type: 'place',
    title: 'Suburb',
    question: 'Which suburb is the fence going in? A postcode works too.',
  },
  {
    key: 'material',
    type: 'enum',
    title: 'Material',
    question: QUESTIONS.material,
    source: 'core.materials',
    acceptsExtras: true,
  },
  {
    key: 'heightKey',
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
    type: 'number',
    title: 'Length',
    question: QUESTIONS.lengthMeters,
    options: [...LENGTHS],
  },
  {
    key: 'removal',
    type: 'enum',
    title: 'Old fence',
    question: QUESTIONS.removal,
    source: 'core.removes',
    pinned: { label: 'Nothing to remove', value: 'none' },
  },
  {
    key: 'conditions',
    type: 'multiEnum',
    title: 'Site conditions',
    question: QUESTIONS.conditions,
    source: 'core.conditions',
    pinned: { label: 'Nothing tricky', value: 'none' },
  },
  {
    key: 'gateType',
    type: 'enum',
    title: 'Gate',
    question: QUESTIONS.gateType,
    source: 'core.gateTypes',
    pinned: { label: 'No gates', value: 'none' },
  },
  {
    key: 'gateQty',
    type: 'count',
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
