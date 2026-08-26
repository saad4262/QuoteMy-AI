import { logger } from '../config.js';
import { CUSTOMER_LABEL_GROUPS, QUESTIONS } from '../messages.js';
import { getRepository } from '../store.js';
import { CONDITIONS, GATE_TYPES, MATERIALS, REMOVES, type Trade } from '../vocab.js';
import type { ExtraValue } from '../vocabulary.js';
import { FENCING_FIELDS, type FieldSpec } from './fieldSpec.js';
import { HEIGHT_FALLBACK, LENGTHS, QUANTITIES, type ChecklistField } from './vocab.js';

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
    questions: { ...FALLBACK_QUESTIONS },
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
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<Trade, { at: number; value: TradeSchema }>();

export const clearSchemaCache = () => cache.clear();

export async function loadTradeSchema(trade: Trade): Promise<TradeSchema> {
  const hit = cache.get(trade);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value = fallbackSchema(trade);
  try {
    const stored = await getRepository().getTradeSchema(trade);
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
        fromFirestore: Boolean(stored.core || stored.labels || stored.questions),
      };
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
 * The choice list behind each question. Materials, gates, conditions and removals are the trade's
 * vocabulary and come from the schema; lengths and quantities do not - a length is a measurement
 * and a count is a count, neither is something a business publishes rates against.
 */
export interface Sources {
  material: string[];
  removal: string[];
  conditions: string[];
  gateType: string[];
  lengthMeters: (string | number)[];
  gateQty: (string | number)[];
  heightKey: string[];
}

export function sourcesFrom(schema: TradeSchema): Sources {
  return {
    material: [...schema.core.materials],
    removal: [...schema.core.removes],
    conditions: [...schema.core.conditions],
    gateType: [...schema.core.gateTypes],
    lengthMeters: [...LENGTHS],
    gateQty: [...QUANTITIES],
    heightKey: [],
  };
}

/**
 * Heights for a material. `core.heights` may be a flat list, or a map keyed by material for a
 * trade whose heights differ by type. Neither is published today, so this normally returns the
 * built-in band list - and a height nobody nearby actually builds is caught at the end, by the
 * alternatives fallback in `priceAndRank.ts`, where the answer is "here is what somebody CAN do".
 */
export function heightsFor(schema: TradeSchema, material: string | null): string[] {
  const published = schema.core.heights;
  if (Array.isArray(published) && published.length) return [...published];
  if (published && typeof published === 'object') {
    const byMaterial = published as Record<string, string[]>;
    const key = Object.keys(byMaterial).find((candidate) => candidate.toLowerCase() === String(material ?? '').toLowerCase());
    const found = key ? byMaterial[key] : null;
    if (Array.isArray(found) && found.length) return [...found];
  }
  return [...HEIGHT_FALLBACK];
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

/** The question text for a field, from the schema, falling back to the compiled wording. */
export function questionFor(schema: TradeSchema, field: string): string {
  return String(schema.questions[field] || FALLBACK_QUESTIONS[field] || '').trim() || field;
}

export { titleCase };
