import { logger } from '../config.js';
import { CUSTOMER_LABEL_GROUPS, QUESTIONS } from '../messages.js';
import { getRepository, type BusinessRepository } from '../store.js';
import { CONDITIONS, GATE_TYPES, MATERIALS, REMOVES, type Trade } from '../vocab.js';
import type { ExtraValue } from '../vocabulary.js';
import { FENCING_FIELDS, FIELD_TYPES, specOf, type FieldSpec } from './fieldSpec.js';
import { type ChecklistField } from './vocab.js';

/**
 * The trade's vocabulary, read from Firestore `schema/{trade}` at the start of a conversation.
 *
 * This is the join between the two sides of the product. The business side publishes `core`,
 * `labels` and `questions` there (`syncTradeSchema`) and grows `extras` as businesses submit
 * (`mergeTradeExtras`); the customer chat builds every question and every multiple choice from
 * this document. So a business-side vocabulary change reaches a customer's screen with no code
 * change on this side, and adding a trade is a new document rather than a new chat flow.
 *
 * The compiled vocabulary is kept as a FALLBACK only, for a Firestore outage or a trade whose
 * document has not been published yet. A conversation that degrades to the built-in list still
 * works; one that degrades to an empty list would show a question with no answers.
 */

export interface TradeSchema {
  trade: Trade;
  core: {
    materials: string[];
    gateTypes: string[];
    conditions: string[];
    /** Customer-facing: the business-side wildcard `any` is filtered out here, never offered. */
    removes: string[];
    heights: string[] | Record<string, string[]> | null;
  };
  labels: {
    materials: Record<string, string>;
    gateTypes: Record<string, string>;
    conditions: Record<string, string>;
    removes: Record<string, string>;
  };
  /**
   * Wording PUBLISHED for this trade, and only that - not a copy of the compiled defaults. Keeping
   * the two apart is what lets an override be told from a default: a document that says nothing
   * about a question leaves the field's own wording standing, and one that does say something wins.
   */
  questions: Record<string, string>;
  /**
   * Which fields this trade's checklist has, in the order they are asked. Compiled for now; the
   * whole point of `docs/DYNAMIC-SCHEMA-PLAN.md` is that this ends up published alongside `core`.
   */
  fields: FieldSpec[];
  extras: Record<string, ExtraValue>;
  /** False when this fell back to the compiled vocabulary - surfaced in logs, not to the customer. */
  fromFirestore: boolean;
}

const FALLBACK_QUESTIONS: Record<string, string> = {
  suburb: 'Which suburb is the fence going in?',
  ...QUESTIONS,
};

function fallbackSchema(trade: Trade, extras: Record<string, ExtraValue> = {}): TradeSchema {
  return {
    trade,
    core: {
      materials: [...MATERIALS],
      gateTypes: [...GATE_TYPES],
      conditions: [...CONDITIONS],
      removes: REMOVES.filter((r) => r !== 'any'),
      heights: null,
    },
    labels: {
      materials: { ...CUSTOMER_LABEL_GROUPS.materials },
      gateTypes: { ...CUSTOMER_LABEL_GROUPS.gateTypes },
      conditions: { ...CUSTOMER_LABEL_GROUPS.conditions },
      removes: { ...CUSTOMER_LABEL_GROUPS.removes },
    },
    questions: {},
    fields: [...FENCING_FIELDS],
    extras,
    fromFirestore: false,
  };
}

const list = (value: unknown, fallback: string[]): string[] =>
  Array.isArray(value) && value.length ? value.filter((v): v is string => typeof v === 'string') : fallback;

const map = (value: unknown, fallback: Record<string, string>): Record<string, string> =>
  value && typeof value === 'object' && Object.keys(value).length ? (value as Record<string, string>) : fallback;

/**
 * Read once per conversation, not per turn.
 *
 * Cached process-wide with a short TTL rather than round-tripped through the client: the document
 * is a few kilobytes, and carrying it in every request and response would dwarf the actual
 * message. Five minutes means one Firestore read serves every conversation in that window, and
 * the worst case is a customer part-way through a chat seeing a material a business added four
 * minutes ago - which is the right way round.
 */
/**
 * A published field spec this code cannot execute is worse than no published spec at all: it
 * reaches a customer as a question with no answers, or a field nothing knows how to validate.
 *
 * Checked once at load, and an unusable document falls back WHOLE to the compiled spec rather than
 * being half-used - a half-applied spec is the shape of bug that looks like the chat forgetting a
 * question rather than like a bad document.
 */
function structurallyUsable(fields: unknown, trade: Trade): FieldSpec[] | null {
  if (!Array.isArray(fields) || !fields.length) return null;

  const refuse = (why: string): null => {
    logger.warn({ trade, why }, 'published field spec is unusable, falling back to the compiled one');
    return null;
  };

  const specs: FieldSpec[] = [];
  const keys = new Set<string>();
  for (const entry of fields) {
    const spec = entry as FieldSpec;
    if (!spec || typeof spec.key !== 'string' || !spec.key) return refuse('a field has no key');
    if (keys.has(spec.key)) return refuse(`${spec.key} is named twice`);
    if (!FIELD_TYPES.includes(spec.type)) return refuse(`${spec.key} has unknown type ${String(spec.type)}`);
    keys.add(spec.key);
    specs.push(spec);
  }

  for (const spec of specs) {
    if (spec.dependsOn && !keys.has(spec.dependsOn.field)) {
      return refuse(`${spec.key} depends on ${spec.dependsOn.field}, which is not a field`);
    }
    if (spec.optionsKeyedBy && !keys.has(spec.optionsKeyedBy)) {
      return refuse(`${spec.key} is keyed by ${spec.optionsKeyedBy}, which is not a field`);
    }
  }
  return specs;
}

/** A multiple choice with nothing in it is a dead end, so a field that cannot offer one is refused. */
function canOffer(schema: TradeSchema, spec: FieldSpec): boolean {
  if (spec.type !== 'enum' && spec.type !== 'multiEnum') return true; // free text is a real answer
  if (spec.options?.length) return true;
  const published = spec.source ? at(schema, spec.source) : undefined;
  if (Array.isArray(published) && published.length) return true;
  return Boolean(spec.optionsKeyedBy && published && typeof published === 'object');
}

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<Trade, { at: number; value: TradeSchema }>();

export const clearSchemaCache = () => cache.clear();

export async function loadTradeSchema(trade: Trade, repo: BusinessRepository = getRepository()): Promise<TradeSchema> {
  const hit = cache.get(trade);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value = fallbackSchema(trade);
  try {
    const stored = await repo.getTradeSchema(trade);
    if (stored) {
      const base = fallbackSchema(trade, stored.extras ?? {});
      value = {
        ...base,
        core: {
          materials: list(stored.core?.materials, base.core.materials),
          gateTypes: list(stored.core?.gateTypes, base.core.gateTypes),
          conditions: list(stored.core?.conditions, base.core.conditions),
          // `any` is a business-side wildcard - "we'll take away whatever is there". A customer
          // cannot answer it about their own old fence, so it never becomes a choice.
          removes: list(stored.core?.removes, base.core.removes).filter((r) => r !== 'any'),
          heights: stored.core?.heights ?? null,
        },
        labels: {
          materials: map(stored.labels?.materials, base.labels.materials),
          gateTypes: map(stored.labels?.gateTypes, base.labels.gateTypes),
          conditions: map(stored.labels?.conditions, base.labels.conditions),
          removes: map(stored.labels?.removes, base.labels.removes),
        },
        questions: { ...base.questions, ...(stored.questions ?? {}) },
        fields: structurallyUsable(stored.fields, trade) ?? base.fields,
        fromFirestore: Boolean(stored.core || stored.labels || stored.questions || stored.fields),
      };

      // Only now is the whole document assembled, so only now can a field's source be resolved.
      const dead = value.fields.filter((spec) => !canOffer(value, spec));
      if (dead.length) {
        logger.warn(
          { trade, fields: dead.map((spec) => spec.key) },
          'published field spec has questions with no answers, falling back to the compiled one',
        );
        value = { ...value, fields: [...base.fields] };
      }
    }
  } catch (err) {
    // A schema we cannot read is not a reason to refuse a conversation - the compiled vocabulary
    // still describes the trade correctly, it just cannot see anything added since the last deploy.
    logger.warn({ err, trade }, 'could not load trade schema, using compiled vocabulary');
  }

  cache.set(trade, { at: Date.now(), value });
  return value;
}

/**
 * The choice list behind each question, keyed by field. Every list comes from the trade's own field
 * spec: either a path into the schema document (the trade's vocabulary) or a literal list for the
 * things no business publishes rates against - a length is a measurement and a count is a count.
 */
export type Sources = Record<string, (string | number)[]>;

/** Dotted path into the loaded schema: `core.materials` -> `schema.core.materials`. */
function at(schema: TradeSchema, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((node, key) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[key] : undefined), schema);
}

/**
 * One field's options.
 *
 * `keyedByValue` is only consulted for a field whose published options are a map rather than a
 * list - fencing heights, for a trade that builds different types to different heights. A flat
 * published list wins over it, and the spec's literal list is the last resort. Neither is published
 * today, so this normally returns the literal list, and a height nobody nearby actually builds is
 * caught at the end by the alternatives fallback in `priceAndRank.ts`.
 */
export function optionsFor(schema: TradeSchema, spec: FieldSpec, keyedByValue?: string | null): (string | number)[] {
  const published = spec.source ? at(schema, spec.source) : undefined;

  if (Array.isArray(published) && published.length) return [...published];

  if (spec.optionsKeyedBy && published && typeof published === 'object') {
    const byKey = published as Record<string, unknown>;
    const wanted = String(keyedByValue ?? '').toLowerCase();
    const key = Object.keys(byKey).find((candidate) => candidate.toLowerCase() === wanted);
    const found = key ? byKey[key] : null;
    if (Array.isArray(found) && found.length) return [...found];
  }

  return spec.options ? [...spec.options] : [];
}

/**
 * Every field's options at the start of a turn. A field whose options are keyed by another answer
 * gets an empty list here and is filled in by the caller once that answer exists - which is what
 * keeps the off-list height check from running before a material has been chosen.
 */
export function sourcesFrom(schema: TradeSchema): Sources {
  const sources: Sources = {};
  for (const spec of schema.fields) {
    sources[spec.key] = spec.optionsKeyedBy ? [] : optionsFor(schema, spec);
  }
  return sources;
}

const GROUPS: Partial<Record<ChecklistField, keyof TradeSchema['labels']>> = {
  material: 'materials',
  removal: 'removes',
  conditions: 'conditions',
  gateType: 'gateTypes',
};

const titleCase = (value: unknown): string => {
  const text = String(value).replace(/[_-]+/g, ' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
};

/**
 * Slug -> the words a customer reads, for one trade's schema. A function per conversation rather
 * than a module-level lookup, because the labels now belong to the document that was loaded.
 */
export function makeLabelFor(schema: TradeSchema) {
  return function labelFor(field: ChecklistField, value: unknown): string {
    const group = GROUPS[field];
    const table = group ? schema.labels[group] : undefined;
    if (table?.[String(value)]) return table[String(value)]!;
    // An extra carries its own label ("Bamboo screening") and is not in labels.materials.
    if (field === 'material' && schema.extras[String(value)]?.label) return schema.extras[String(value)]!.label;
    if (field === 'lengthMeters') return value + 'm';
    if (field === 'gateQty') return value + (Number(value) === 1 ? ' gate' : ' gates');
    if (field === 'heightKey') return String(value);
    return titleCase(value);
  };
}

export type LabelFor = ReturnType<typeof makeLabelFor>;

/**
 * The wording a field is asked in.
 *
 * A wording published in the trade's `questions` map wins, because saying it there is an explicit
 * override and there is a test that says so. Otherwise the field's own spec answers, which is where
 * wording belongs now and the one place to edit it. The compiled map is the last resort, for a
 * trade whose document has not been published yet.
 */
export function questionFor(schema: TradeSchema, field: string): string {
  const spec = specOf(schema.fields, field);
  return String(schema.questions[field] || spec?.question || FALLBACK_QUESTIONS[field] || '').trim() || field;
}

export { titleCase };
