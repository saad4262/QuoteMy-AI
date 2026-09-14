import {
  DECKING_BOUNDS,
  DECK_BALUSTRADES,
  DECK_CONDITIONS,
  DECK_EXTRAS,
  DECK_HEIGHTS,
  DECK_MATERIALS,
  DECK_REMOVES,
  DECK_SCREENS,
  DECK_STAIRS,
  DECK_TAGS,
  UNITS,
  type DeckBalustrade,
  type DeckCondition,
  type DeckExtra,
  type DeckHeight,
  type DeckMaterial,
  type DeckRemoves,
  type DeckScreen,
  type DeckStair,
  type Trade,
  type Unit,
} from '../vocab.js';
import type { DeckingExtraction } from '../schemas.js';
import { slugify } from '../vocabulary.js';
import { makeChecks, MAX_ENTRIES, type VerifiedServiceArea } from './shared.js';

/**
 * Decking's shape, and the vocabulary gate that goes with it.
 *
 * What a decking price list IS: a rate per square metre for a board at a height, with the stairs,
 * the balustrade and the screens priced against three different things. That is what makes this
 * trade its own: it is the only one in the product where a single quote multiplies THREE separate
 * quantities. The deck is square metres, the balustrade is linear metres along its edge, and the
 * stairs are flights.
 *
 * Height is a required rate key here and a finish nowhere. It decides what is UNDER the deck -
 * posts, bracing, deeper footings, a balustrade the law may require - so a rate that has lost its
 * height is a rate for a build nobody described. That is why, unlike a retaining wall's nullable
 * height band, this one cannot be null.
 *
 * The quote and bounds gates are shared with every other trade and live in `shared.ts`.
 */

export type DeckRateUnit = 'per_sqm' | 'per_metre' | 'per_item' | 'per_job';
export type DeckConditionUnit = 'per_sqm' | 'per_item' | 'per_job' | 'per_hour' | 'per_day';

export interface DeckRate {
  material: DeckMaterial;
  pricePerSqm: number;
}

export interface DeckingVerifiedPricing {
  gstIncluded: boolean | null;
  /**
   * What they will actually lay, computed from the rates that survived - never from what they
   * claimed. The field no other trade's shape has, which is what `isDeckingPricing` narrows on.
   *
   * Named `enabledDeckMaterials` and NOT `enabledMaterials` deliberately: that is fencing's name,
   * `isFencingPricing` keys on it, and a deck is built of timber exactly as a fence is - so the
   * obvious name would have made every decking document read back out of Firestore as a fence and
   * priced per linear metre of fencing. Retaining wall nearly made the same mistake.
   */
  enabledDeckMaterials: DeckMaterial[];
  /** Which heights they build at, for the same reason - and it is the outer rate key. */
  enabledDeckHeights: DeckHeight[];
  /** Keyed by deck height, because that is the coarser question and the one a customer answers first. */
  rates: Record<string, DeckRate[]>;
  /** The second quantity: along the deck's edge, never across its floor. */
  balustrades: { type: DeckBalustrade; price: number; unit: 'per_metre' | 'per_job' }[];
  /** The third: a flight at a time, or a price per step. */
  stairs: { grade: DeckStair | null; label: string; price: number; unit: 'per_item' | 'per_job' }[];
  screens: { type: DeckScreen; price: number; unit: 'per_sqm' | 'per_metre' | 'per_job' }[];
  removals: { removes: DeckRemoves; price: number; unit: 'per_sqm' | 'per_job' }[];
  siteConditions: { condition: DeckCondition; price: number | null; percent: number | null; unit: DeckConditionUnit | null }[];
  extras: { type: DeckExtra | null; label: string; price: number | null; unit: Unit | null; isFromPrice: boolean }[];
  serviceArea: VerifiedServiceArea;
  minimumCharge: number | null;
  siteInspectionFee: number | null;
  designFee: number | null;
  travelFee: number | null;
}

export interface DeckingVerifiedCapabilities {
  businessName: string | null;
  /**
   * Where they stand on engineering and a building permit. Recorded as what the BUSINESS said and
   * never as a judgement about whether a given deck needs one: the trade's own knowledge base is
   * emphatic that nobody may claim all decks need a permit or that none do.
   */
  engineering: { text: string | null; price: number | null; isFromPrice: boolean };
  warranty: { text: string | null };
  tags: string[];
  inclusions: string[];
  exclusions: string[];
}

export interface DeckingVerifiedOffering {
  slug: string;
  label: string;
  price: number | null;
  unit: Unit | null;
}

export interface DeckingVerifiedResult {
  trade: Trade;
  status: 'verified' | 'unverified';
  pricing: DeckingVerifiedPricing;
  capabilities: DeckingVerifiedCapabilities;
  otherOfferings: DeckingVerifiedOffering[];
  couldNotUse: string[];
  ratesKept: number;
  coverage: Record<string, number>;
}

/**
 * Below this, a "rate per square metre" is almost certainly a BOARD price rather than an installed
 * one - what a supplier charges for the timber, lifted off a merchant's page.
 *
 * Not dropped, because a business is entitled to price how it likes and a cheap ground-level pine
 * deck is a real thing. Flagged, because the difference between $48 of boards and $280 of finished
 * deck is the entire job, and a customer quoted the first will not be charged it.
 */
const BOARD_PRICE_SUSPICION = 150;

export function verifyDecking(
  x: DeckingExtraction,
  sourceText: string,
  trade: Trade,
  knownSlugs: readonly string[] = [],
): DeckingVerifiedResult {
  const unmapped = [...x.couldNotUse];
  const { quoted, num, str, take, strList } = makeChecks(sourceText, unmapped);
  const B = DECKING_BOUNDS;

  // ---- core rates -> { deckHeight: [ { material, pricePerSqm } ] } ----
  const rates: Record<string, DeckRate[]> = {};
  let ratesKept = 0;
  for (const r of take(x.rates, MAX_ENTRIES)) {
    if (!DECK_MATERIALS.includes(r.material)) {
      unmapped.push(`Could not file a rate under "${r.material}" - that is not a decking board we hold, so it was not saved.`);
      continue;
    }
    /* No guessing a height. A rate whose height was never stated is a rate for a build nobody
       described: the same board is a different job on the ground and a storey up, and picking
       either one invents most of the structure. */
    if (!DECK_HEIGHTS.includes(r.deckHeight)) {
      unmapped.push(
        `Dropped a ${r.material} rate - we could not tell what deck height $${r.pricePerSqm} per square metre is for. ` +
          `Please say which heights each rate covers.`,
      );
      continue;
    }
    if (!num(r.pricePerSqm, B.pricePerSqm.max)) {
      unmapped.push(`Dropped the ${r.deckHeight} ${r.material} rate - ${r.pricePerSqm} per square metre is outside the range we accept.`);
      continue;
    }
    if (!quoted(r.sourceQuote)) {
      unmapped.push(`Dropped the ${r.deckHeight} ${r.material} rate - could not find that figure in your description.`);
      continue;
    }

    const bucket = (rates[r.deckHeight] ??= []);
    const already = bucket.find((e) => e.material === r.material);
    // The same board at the same height, priced twice. Unchecked, the second silently overwrites
    // the first and a customer is quoted whichever happened to be last in the document.
    if (already) {
      if (already.pricePerSqm !== r.pricePerSqm) {
        unmapped.push(
          `You have priced ${r.material} at ${r.deckHeight} twice, at $${already.pricePerSqm} and $${r.pricePerSqm} ` +
            `per square metre. We kept $${already.pricePerSqm} - tell us which one is right.`,
        );
      }
      continue;
    }
    bucket.push({ material: r.material, pricePerSqm: r.pricePerSqm });
    ratesKept += 1;

    if (r.pricePerSqm < BOARD_PRICE_SUSPICION) {
      unmapped.push(
        `Worth checking: ${r.material} at ${r.deckHeight} is $${r.pricePerSqm} per square metre, which is nearer a ` +
          `board price than a built deck. We saved it as written.`,
      );
    }
  }

  /* A deck that costs less the further off the ground it is. Almost always the height headings have
     been read off the wrong rows - an elevated deck needs posts, bracing and deeper footings that a
     ground-level one does not, so it cannot be cheaper. Flagged and not dropped: a builder may be
     clearing old stock of one board, and that is theirs to decide. */
  const ORDER = [...DECK_HEIGHTS];
  for (const material of new Set(Object.values(rates).flatMap((b) => b.map((e) => e.material)))) {
    const byHeight = ORDER.map((h) => ({ height: h, price: rates[h]?.find((e) => e.material === material)?.pricePerSqm }))
      .filter((e): e is { height: DeckHeight; price: number } => e.price !== undefined);

    for (let i = 1; i < byHeight.length; i += 1) {
      const higher = byHeight[i]!;
      const lower = byHeight[i - 1]!;
      if (higher.price < lower.price) {
        unmapped.push(
          `Worth checking: your ${material} is $${higher.price} per square metre at ${higher.height} but ` +
            `$${lower.price} at ${lower.height} - the higher deck costs less. We saved both as written.`,
        );
      }
    }
  }

  // ---- balustrade: the second quantity ----
  const balustrades: DeckingVerifiedPricing['balustrades'] = [];
  for (const b of take(x.balustrades, 20)) {
    if (!DECK_BALUSTRADES.includes(b.type)) {
      unmapped.push(`Could not file a balustrade price under "${b.type}" - not a type we hold.`);
      continue;
    }
    if (!num(b.price, B.price.max) || !quoted(b.sourceQuote)) {
      unmapped.push(`Dropped a balustrade price - could not verify ${b.price} against your description.`);
      continue;
    }
    /* The unit is the whole point of this section. A balustrade runs along the deck's EDGE, so it is
       measured in linear metres; priced per square metre it would be charged against the floor area
       behind it, which on a 40m2 deck is several times the railing that actually exists. */
    if (b.unit !== 'per_metre' && b.unit !== 'per_job') {
      unmapped.push(
        `Dropped a ${b.type} balustrade price - a balustrade is priced per LINEAR metre along the deck edge, ` +
          `or as one figure for the job. We could not read it as either.`,
      );
      continue;
    }
    if (balustrades.some((e) => e.type === b.type)) continue;
    balustrades.push({ type: b.type, price: b.price, unit: b.unit });
  }

  // ---- stairs: the third quantity ----
  const stairs: DeckingVerifiedPricing['stairs'] = [];
  for (const s of take(x.stairs, 20)) {
    const label = str(s.label);
    if (!label) continue;
    if (!num(s.price, B.price.max) || !quoted(s.sourceQuote)) {
      unmapped.push(`Dropped the "${label}" stair price - could not verify it against your description.`);
      continue;
    }
    if (s.unit !== 'per_item' && s.unit !== 'per_job') continue;
    if (stairs.some((e) => e.label.toLowerCase() === label.toLowerCase())) continue;
    stairs.push({
      grade: s.grade && DECK_STAIRS.includes(s.grade) ? s.grade : null,
      label,
      price: s.price,
      unit: s.unit,
    });
  }

  // ---- screens ----
  const screens: DeckingVerifiedPricing['screens'] = [];
  for (const sc of take(x.screens, 20)) {
    if (!DECK_SCREENS.includes(sc.type)) continue;
    if (!num(sc.price, B.price.max) || !quoted(sc.sourceQuote)) {
      unmapped.push(`Dropped a privacy screen price - could not verify ${sc.price} against your description.`);
      continue;
    }
    if (sc.unit !== 'per_sqm' && sc.unit !== 'per_metre' && sc.unit !== 'per_job') continue;
    if (screens.some((e) => e.type === sc.type)) continue;
    screens.push({ type: sc.type, price: sc.price, unit: sc.unit });
  }

  // ---- removals ----
  const removals: DeckingVerifiedPricing['removals'] = [];
  for (const r of take(x.removals, 20)) {
    if (!DECK_REMOVES.includes(r.removes)) continue;
    if (!num(r.price, B.price.max) || !quoted(r.sourceQuote)) {
      unmapped.push(`Dropped a removal price - could not verify ${r.price} against your description.`);
      continue;
    }
    if (r.unit !== 'per_sqm' && r.unit !== 'per_job') continue;
    if (removals.some((e) => e.removes === r.removes)) continue;
    removals.push({ removes: r.removes, price: r.price, unit: r.unit });
  }

  /* Pulling a deck up almost never costs more than laying one down. When the figures say it does,
     the two have usually been read off adjacent lines. Only per-m2 removals are compared - a
     per-job removal and a per-m2 build are different quantities. */
  const cheapestBuild = Math.min(
    ...Object.values(rates).flatMap((bucket) => bucket.map((e) => e.pricePerSqm)),
    Number.POSITIVE_INFINITY,
  );
  for (const r of removals) {
    if (r.unit === 'per_sqm' && Number.isFinite(cheapestBuild) && r.price > cheapestBuild) {
      unmapped.push(
        `Worth checking: taking an old deck out is $${r.price} per square metre, more than your cheapest new deck ` +
          `at $${cheapestBuild}. We saved both as written.`,
      );
    }
  }

  // ---- site condition surcharges ----
  const siteConditions: DeckingVerifiedPricing['siteConditions'] = [];
  for (const s of take(x.siteConditions, 20)) {
    if (!DECK_CONDITIONS.includes(s.condition)) continue;

    const price = num(s.price, B.price.max) ? s.price : null;
    // A surcharge over 100% is a misread, not a business decision.
    const percent = num(s.percent, 100) ? s.percent : null;

    if ((price === null && percent === null) || !quoted(s.sourceQuote)) {
      unmapped.push(`Dropped the ${s.condition} surcharge - could not verify it against your description.`);
      continue;
    }
    // Both would be ambiguous: a quote cannot add $450 AND 10%. Keep the stated one.
    const entry = {
      condition: s.condition,
      price,
      percent: price === null ? percent : null,
      unit: price !== null ? s.unit : null,
    };

    const already = siteConditions.find((c) => c.condition === s.condition);
    if (already) {
      const show = (c: typeof entry) => (c.price !== null ? `$${c.price}` : `${c.percent}%`);
      if (show(already) !== show(entry)) {
        unmapped.push(
          `You have priced the ${s.condition} surcharge twice, as ${show(already)} and ${show(entry)}. ` +
            `We kept ${show(already)} - tell us which one is right.`,
        );
      }
      continue;
    }
    siteConditions.push(entry);
  }

  // ---- other priced add-ons ----
  const extras: DeckingVerifiedPricing['extras'] = [];
  for (const e of take(x.extras, 40)) {
    const label = str(e.label);
    if (!label) continue;
    const ok = num(e.price, B.price.max) && quoted(e.sourceQuote);
    extras.push({
      type: e.type && DECK_EXTRAS.includes(e.type) ? e.type : null,
      label,
      price: ok ? (e.price as number) : null,
      unit: e.unit && UNITS.includes(e.unit) ? e.unit : null,
      isFromPrice: e.isFromPrice === true,
    });
    if (e.price != null && !ok) {
      unmapped.push(`Kept "${label}" but not its price - could not verify that figure against your description.`);
    }
  }

  // ---- service area ----
  const sa = x.serviceArea;
  const radiusKm = num(sa.radiusKm, B.radiusKm.max) ? sa.radiusKm : null;
  if (sa.radiusKm != null && radiusKm === null) {
    unmapped.push(`Dropped the travel radius - ${sa.radiusKm}km is outside the range we accept.`);
  }

  // ---- GST ----
  let gstIncluded = typeof x.gstIncluded === 'boolean' ? x.gstIncluded : null;
  if (gstIncluded !== null && x.gstSourceQuote && !quoted(x.gstSourceQuote)) {
    unmapped.push('Could not confirm the GST wording against your description, so it was left unset.');
    gstIncluded = null;
  }

  // ---- the four fees ----
  const fee = (value: number | null, sourceQuote: string | null, name: string): number | null => {
    if (value == null) return null;
    if (!num(value, B.price.max)) {
      unmapped.push(`Dropped the ${name} - ${value} is outside the range we accept.`);
      return null;
    }
    if (!quoted(sourceQuote)) {
      unmapped.push(`Dropped the ${name} - could not find that figure in your description.`);
      return null;
    }
    return value;
  };

  const minimumCharge = fee(x.minimumCharge, x.minimumChargeSourceQuote, 'minimum charge');
  const siteInspectionFee = fee(x.siteInspectionFee, x.siteInspectionFeeSourceQuote, 'site inspection fee');
  const designFee = fee(x.designFee, x.designFeeSourceQuote, 'design fee');
  const travelFee = fee(x.travelFee, x.travelFeeSourceQuote, 'travel fee');

  /* A price list with no surviving core rate is not something to mark verified, even though the
     review step approved it - it would show an empty pricing screen and quote nobody. */
  const status = ratesKept > 0 ? 'verified' : 'unverified';
  if (ratesKept === 0) {
    unmapped.push('No usable rates could be read from your description - please restate your prices and send again.');
  }

  const pricing: DeckingVerifiedPricing = {
    gstIncluded,
    enabledDeckMaterials: [...new Set(Object.values(rates).flatMap((b) => b.map((e) => e.material)))],
    enabledDeckHeights: DECK_HEIGHTS.filter((h) => (rates[h]?.length ?? 0) > 0),
    rates,
    balustrades,
    stairs,
    screens,
    removals,
    siteConditions,
    extras,
    serviceArea: {
      baseLocation: str(sa.baseLocation),
      resolved: null, // the pipeline fills this in; verification does no network calls
      radiusKm,
      excludedAreas: strList(sa.excludedAreas, 40),
    },
    minimumCharge,
    siteInspectionFee,
    designFee,
    travelFee,
  };

  const eng = x.engineering;
  const capabilities: DeckingVerifiedCapabilities = {
    businessName: str(x.businessName),
    engineering: {
      text: quoted(eng?.sourceQuote) ? str(eng?.text) : null,
      price: num(eng?.price, B.price.max) && quoted(eng?.sourceQuote) ? eng.price : null,
      isFromPrice: eng?.isFromPrice === true,
    },
    warranty: { text: quoted(x.warranty?.sourceQuote) ? str(x.warranty?.text) : null },
    tags: x.tags.filter((t) => (DECK_TAGS as readonly string[]).includes(t)),
    inclusions: strList(x.inclusions, 40),
    exclusions: strList(x.exclusions, 40),
  };

  // ---- the long tail ------------------------------------------------------------------------
  // Same gates as a core rate. The tier is looser about WHAT can be named, never about the numbers
  // attached to it - an unverifiable price here would reach a customer exactly like any other.
  const otherOfferings: DeckingVerifiedOffering[] = [];
  for (const o of take(x.otherOfferings, 40)) {
    const label = str(o.label);
    if (!label) continue;

    if (!quoted(o.sourceQuote)) {
      unmapped.push(`Could not find "${label}" in your description, so it was not saved.`);
      continue;
    }
    if (o.price != null && !num(o.price, B.price.max)) {
      unmapped.push(`Dropped the ${label} price - ${o.price} is outside the range we accept.`);
      continue;
    }

    // The model may only reuse a slug it was actually shown; anything else is built here from the
    // label, so a slug can never be something the model made up.
    const slug = o.slug && knownSlugs.includes(o.slug) ? o.slug : slugify(label);

    otherOfferings.push({
      slug,
      label,
      price: o.price ?? null,
      unit: o.unit && UNITS.includes(o.unit) ? o.unit : null,
    });
  }

  return {
    trade,
    status,
    pricing,
    capabilities,
    otherOfferings,
    couldNotUse: unmapped,
    ratesKept,
    coverage: {
      rates: ratesKept,
      heights: pricing.enabledDeckHeights.length,
      balustrades: balustrades.length,
      stairs: stairs.length,
      screens: screens.length,
      removals: removals.length,
      siteConditions: siteConditions.length,
      extras: extras.length,
      tags: capabilities.tags.length,
      otherOfferings: otherOfferings.length,
      couldNotUse: unmapped.length,
    },
  };
}
