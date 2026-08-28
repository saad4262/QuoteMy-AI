import type { ServiceExtract } from '../store.js';
import { slug } from './fuzzyMatch.js';
import type { MatchedBusiness, MatchResult } from './matcher.js';
import { titleCase, type TradeSchema } from './schema.js';
import type { AlternativeOffer, ChatResponse, Checklist, ComparisonQuote, QuoteResult, UiState } from './schemas.js';

/**
 * Every business that covers the customer, priced off its own published rates, cheapest first.
 * Ported from n8n's `Price & Rank Businesses` node. Runs once, only after the checklist is
 * complete and the customer has confirmed - nothing above this point has touched a business
 * record.
 *
 * When nothing can quote the brief exactly, that is not the end of it: the businesses covering
 * this customer can quote SOMETHING, and the nearest of those is worth putting on screen.
 */

/**
 * A business writes its rate table with its own spelling of a material; the schema's spelling is
 * the canonical one, and is what the checklist and every option value use. A value is put back
 * into it before it is labelled or offered, so an alternative the customer taps is one the
 * checklist can accept as-is.
 */
function makeMaterialNaming(schema: TradeSchema) {
  const materials = schema.labels.materials;
  const canonicalMaterial = (value: string): string =>
    Object.keys(materials).find((k) => slug(k) === slug(value)) ?? value;
  const materialLabel = (value: string): string => {
    const key = canonicalMaterial(value);
    return materials[key] ?? schema.extras[key]?.label ?? titleCase(key);
  };
  return { canonicalMaterial, materialLabel };
}

/* The checklist is untyped data as of step 9 - which fields exist is the trade's business, published
   in its schema document. Fencing's pricing model reads the ones it needs and coerces at the
   boundary rather than trusting a shape nobody guarantees. Step 19 of the migration plan is what
   makes these names come from the pricing spec too. */
const asNumber = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);
const asText = (value: unknown): string | null => (typeof value === 'string' && value ? value : null);
const asTextList = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : [];

const GST_MULTIPLIER = 1.1;
/** Every figure shown or compared is what the customer would actually pay - an exclusive rate looks 10% cheaper than it is. */
const payable = (amount: number, gstIncluded: boolean): number => (gstIncluded ? Math.round(amount) : Math.round(amount * GST_MULTIPLIER));

interface Quote {
  uid: string;
  businessName: string;
  suburb: string;
  distanceKm: number;
  material: string;
  heightKey: string;
  ratePerMeter: number;
  autoAcceptsAi: boolean;
  currency: string;
  projectTotalMin: number;
  projectTotalMax: number;
  estimatedTotal: number;
  warranty: string | null;
  badges: string[];
}

type Blocked = 'material' | 'height' | 'removal' | 'gate';

interface Brief {
  material: string;
  heightMetres: number;
  lengthMetres: number;
  conditions: string[];
  removal: string | null; // 'timber' | 'metal' | null
  gateType: string | null;
  gateQty: number;
}

/**
 * One business, one fence. Everything except the material and the height is the customer's brief
 * unchanged - length, removal, site conditions and gate all still apply - which is what makes an
 * "alternative" an alternative rather than a different job.
 */
function quoteFor(
  business: MatchedBusiness,
  extract: ServiceExtract,
  materialSlug: string,
  heightMetres: number,
  heightLabel: string,
  brief: Brief,
): Quote | { blocked: Blocked } {
  const pricing = extract.pricing!;
  const capabilities = extract.capabilities;
  const enabled = pricing.enabledMaterials.map(slug);

  let rate: number | null = null;
  let priced = heightLabel;

  if (enabled.includes(materialSlug)) {
    const rateKey = Object.keys(pricing.rates).find((key) => slug(key) === materialSlug);
    if (!rateKey) return { blocked: 'material' };
    const table = pricing.rates[rateKey] ?? {};
    const key = Object.keys(table).find((entry) => Math.abs(Number.parseFloat(entry) - heightMetres) < 0.001);
    if (key === undefined) return { blocked: 'height' };
    rate = table[key] ?? null;
    priced = key;
    if (rate === null) return { blocked: 'height' };
  } else {
    // Something outside the trade vocabulary this business does anyway, priced on its own line.
    // It carries one per-metre price and at most one height - the only height that business builds it at.
    const offerings = capabilities?.otherOfferings ?? [];
    const offering = offerings.find((row) => slug(row.slug) === materialSlug || slug(row.label) === materialSlug);
    if (!offering) return { blocked: 'material' };
    if (offering.heightM !== null && Math.abs(offering.heightM - heightMetres) > 0.001) return { blocked: 'height' };
    if (offering.pricePerMetre === null) return { blocked: 'material' };
    rate = offering.pricePerMetre;
  }

  // Removal is priced by what the OLD fence is made of, routinely not what the new one will be.
  let removalPerMetre = 0;
  if (brief.removal) {
    const entry = pricing.removals.find((row) => slug(row.removes) === brief.removal) ?? pricing.removals.find((row) => slug(row.removes) === 'any');
    // They cannot take the old fence away, so they cannot do this job.
    if (!entry) return { blocked: 'removal' };
    removalPerMetre = entry.pricePerMetre;
  }

  // Named surcharges, not a difficulty flag - a business that never listed a condition simply
  // does not charge extra for it, which is not a reason to drop them.
  let conditionPerMetre = 0;
  let conditionPercent = 0;
  for (const wanted of brief.conditions) {
    const entry = pricing.siteConditions.find((row) => slug(row.condition) === slug(wanted));
    if (!entry) continue;
    conditionPerMetre += entry.extraPerMetre ?? 0;
    conditionPercent += entry.extraPercent ?? 0;
  }

  let gatesTotal = 0;
  let gateFromPrice = false;
  if (brief.gateType) {
    // A gate priced against a specific material wins over one priced for anything.
    const entry =
      pricing.gates.find((row) => slug(row.gateType) === brief.gateType && slug(row.material ?? '') === materialSlug) ??
      pricing.gates.find((row) => slug(row.gateType) === brief.gateType && !row.material);
    if (!entry) return { blocked: 'gate' };
    gatesTotal = entry.price * brief.gateQty;
    gateFromPrice = entry.isFromPrice === true;
  }

  const gstIncluded = pricing.gstIncluded === true;
  // The percentage surcharge is a loading on the work done along the fence line, so it applies to
  // the install and the removal and not to a gate, which is a fixed item either way.
  const perMetre = (rate + removalPerMetre + conditionPerMetre) * (1 + conditionPercent / 100);
  const subtotal = perMetre * brief.lengthMetres + gatesTotal;
  const minimumCharge = payable(pricing.minimumCharge ?? 0, gstIncluded);
  const total = Math.max(payable(subtotal, gstIncluded), minimumCharge);

  const badges: string[] = [];
  badges.push(gstIncluded ? 'incl. GST' : 'incl. GST (added)');
  badges.push(business.distanceKm > 0 ? business.distanceKm + ' km away' : 'In your suburb');
  if (business.rating) badges.push(business.reviewCount ? business.rating + '★ (' + business.reviewCount + ')' : business.rating + '★');
  if (removalPerMetre > 0) badges.push('Removal included');
  if (conditionPerMetre > 0 || conditionPercent > 0) badges.push('Site conditions included');
  if (gatesTotal > 0) badges.push(brief.gateQty === 1 ? 'Gate included' : brief.gateQty + ' gates included');
  if (gateFromPrice) badges.push('Gate priced from');
  if (capabilities?.permits.included === false) badges.push('Permits not included');
  if (business.isAutoAcceptEnabled) badges.push('Instant accept');

  return {
    uid: business.uid,
    businessName: business.businessName,
    suburb: business.suburb,
    distanceKm: business.distanceKm,
    material: materialSlug,
    heightKey: priced,
    ratePerMeter: payable(perMetre, gstIncluded),
    autoAcceptsAi: business.autoAcceptsAi,
    currency: 'AUD',
    projectTotalMin: total,
    projectTotalMax: total,
    estimatedTotal: total,
    warranty: capabilities?.warranty.text ?? null,
    badges,
  };
}

function fail(base: Pick<ChatResponse, 'sessionId' | 'place' | 'checklist' | 'checklistDisplay' | 'checklistPending'>, message: string, reason: string): ChatResponse {
  return {
    sessionId: base.sessionId,
    trade: 'fencing',
    intent: Number(base.checklist.existingPrice) > 0 ? 'compare_quote' : 'new_quote',
    place: base.place,
    type: 'result',
    message,
    options: [],
    results: [],
    avgRatePerMeter: null,
    comparison: null,
    noMatchReason: reason,
    checklistComplete: true,
    checklist: base.checklist,
    checklistDisplay: base.checklistDisplay,
    checklistPending: base.checklistPending,
  };
}

export function priceAndRank(gate: ChatResponse, matcher: MatchResult, schema: TradeSchema): ChatResponse {
  const { canonicalMaterial, materialLabel } = makeMaterialNaming(schema);
  const checklist = gate.checklist as Checklist;
  const base = { sessionId: gate.sessionId, place: gate.place, checklist, checklistDisplay: gate.checklistDisplay, checklistPending: gate.checklistPending };

  if (!matcher.matched) {
    return fail(base, 'No fencing business covers that suburb yet. Try a nearby suburb?', matcher.noMatchReason || 'area');
  }

  const material = asText(checklist.material);
  const heightKey = asText(checklist.heightKey);
  const removal = asText(checklist.removal);
  const gateType = asText(checklist.gateType);

  const wantedMaterial = slug(material);
  const wantedHeight = Number.parseFloat(String(heightKey ?? ''));
  const brief: Brief = {
    material: wantedMaterial,
    heightMetres: wantedHeight,
    lengthMetres: asNumber(checklist.lengthMeters) ?? 0,
    conditions: asTextList(checklist.conditions),
    removal: removal && removal !== 'none' ? slug(removal) : null,
    gateType: gateType && gateType !== 'none' ? slug(gateType) : null,
    gateQty: Math.max(1, Math.round(asNumber(checklist.gateQty) ?? 1)),
  };

  const quotes: Quote[] = [];
  const blocked: Record<Blocked, number> = { material: 0, height: 0, removal: 0, gate: 0 };

  for (let i = 0; i < matcher.businesses.length; i += 1) {
    const business = matcher.businesses[i]!;
    const extract = matcher.pricing[i]!;
    if (!extract.pricing) continue;
    const quote = quoteFor(business, extract, wantedMaterial, wantedHeight, heightKey ?? '', brief);
    if ('blocked' in quote) {
      blocked[quote.blocked] += 1;
      continue;
    }
    quotes.push(quote);
  }

  quotes.sort((a, b) => a.projectTotalMin - b.projectTotalMin || b.ratePerMeter - a.ratePerMeter);

  const claimed = asNumber(checklist.existingPrice);
  const existingPrice = claimed !== null && claimed > 0 ? claimed : null;
  const average = quotes.length > 0 ? Math.round(quotes.reduce((sum, q) => sum + q.projectTotalMin, 0) / quotes.length) : null;

  // "Beat this price" has one honest answer: only what actually beats it.
  const beating = existingPrice === null ? quotes : quotes.filter((q) => q.projectTotalMin < existingPrice);
  const top = beating.slice(0, 3);

  if (top.length === 0 && existingPrice !== null && quotes.length > 0) {
    const closest = quotes[0]!.projectTotalMin;
    return fail(
      base,
      'Nobody covering your suburb came in under $' +
        existingPrice.toLocaleString() +
        '. The closest was $' +
        closest.toLocaleString() +
        ', so the quote you have is already a good one.',
      'notCheaper',
    );
  }

  if (top.length === 0) {
    /* Nothing matched the brief as written. The same businesses are asked again for every
       material and height they DO publish - length, removal, site conditions and gate unchanged.
       Closest first: same material at a different height beats a different material. */
    const alternatives: (Quote & { distanceFromBrief: number })[] = [];
    for (let i = 0; i < matcher.businesses.length; i += 1) {
      const business = matcher.businesses[i]!;
      const extract = matcher.pricing[i]!;
      if (!extract.pricing) continue;
      const enabled = extract.pricing.enabledMaterials.map(slug);
      for (const rateKey of Object.keys(extract.pricing.rates)) {
        const material = slug(rateKey);
        if (!enabled.includes(material)) continue;
        for (const heightKey of Object.keys(extract.pricing.rates[rateKey] ?? {})) {
          const metres = Number.parseFloat(heightKey);
          if (!Number.isFinite(metres) || metres <= 0) continue;
          if (material === wantedMaterial && Math.abs(metres - wantedHeight) < 0.001) continue;
          const quote = quoteFor(business, extract, material, metres, heightKey, brief);
          if ('blocked' in quote) continue;
          if (existingPrice !== null && quote.projectTotalMin >= existingPrice) continue;
          alternatives.push({
            ...quote,
            material: canonicalMaterial(rateKey),
            distanceFromBrief: (material === wantedMaterial ? 0 : 2) + (Math.abs(metres - wantedHeight) < 0.001 ? 0 : 1),
          });
        }
      }
    }

    alternatives.sort((a, b) => a.distanceFromBrief - b.distanceFromBrief || a.projectTotalMin - b.projectTotalMin);

    const seen = new Set<string>();
    const offers: (Quote & { distanceFromBrief: number })[] = [];
    for (const alternative of alternatives) {
      const key = alternative.material + '|' + alternative.heightKey;
      if (seen.has(key)) continue;
      seen.add(key);
      offers.push(alternative);
      if (offers.length >= 3) break;
    }

    if (offers.length) {
      const asked = materialLabel(material ?? '') + (heightKey && heightKey !== 'any' ? ' at ' + heightKey : '');
      const previousUi: UiState = checklist._ui ?? { turn: 0, cursor: {}, lastAsked: null, lastQuestion: '', lastValues: [], lastType: 'message', fixing: false, rejectedPlaces: [], nearbyPlaces: {}, suburbHint: null, place: null };
      const uiOut: UiState = {
        ...previousUi,
        lastAsked: 'alternative',
        lastType: 'question',
        lastQuestion: 'alternatives',
        lastValues: offers.map((o) => 'alt:' + o.material + ':' + o.heightKey),
      };

      const alternativesOut: AlternativeOffer[] = offers.map((offer) => ({
        material: offer.material,
        materialLabel: materialLabel(offer.material),
        heightKey: offer.heightKey,
        businessId: offer.uid,
        businessName: offer.businessName,
        estimatedTotal: offer.projectTotalMin,
        value: 'alt:' + offer.material + ':' + offer.heightKey,
      }));

      return {
        sessionId: gate.sessionId,
        trade: 'fencing',
        intent: existingPrice !== null ? 'compare_quote' : 'new_quote',
        place: gate.place,
        type: 'question',
        message:
          'Nobody near you does ' +
          asked +
          '. The closest they can do is ' +
          materialLabel(offers[0]!.material) +
          ' at ' +
          offers[0]!.heightKey +
          ', $' +
          offers[0]!.projectTotalMin.toLocaleString() +
          ' from ' +
          offers[0]!.businessName +
          '. Want one of these instead?',
        options: offers
          .map((offer) => ({ label: materialLabel(offer.material) + ', ' + offer.heightKey + ' · $' + offer.projectTotalMin.toLocaleString(), value: 'alt:' + offer.material + ':' + offer.heightKey }))
          .concat([{ label: "No thanks, I'll change something", value: 'no' }]),
        noMatchReason: 'alternative',
        checklistComplete: false,
        checklist: { ...checklist, _ui: uiOut },
        checklistDisplay: gate.checklistDisplay,
        checklistPending: gate.checklistPending,
        results: [],
        avgRatePerMeter: null,
        alternatives: alternativesOut,
      };
    }

    const reason = blocked.removal > 0 ? 'removal' : blocked.gate > 0 ? 'gate' : blocked.height > 0 ? 'height' : blocked.material > 0 ? 'material' : 'pricing';
    const message =
      reason === 'removal'
        ? 'None of the businesses near you take away that kind of old fence. Want to arrange the removal separately?'
        : reason === 'gate'
          ? 'Nobody near you prices that gate. Want to try without the gate?'
          : reason === 'height'
            ? 'Nobody near you publishes a rate at that height. Want to try a different height?'
            : reason === 'material'
              ? 'The businesses near you do not offer that fence type yet. Want to try a different type?'
              : 'I found businesses near you, but none of them have finished setting up their pricing yet.';
    return fail(base, message, reason);
  }

  const benchmark = existingPrice === null ? average : existingPrice;
  const cheapest = top[0]!.projectTotalMin;

  const resultsOut: QuoteResult[] = top.map((quote) => ({
    businessId: quote.uid,
    autoAcceptsAi: quote.autoAcceptsAi,
    businessName: quote.businessName,
    suburb: quote.suburb,
    ratePerMeter: quote.ratePerMeter,
    estimatedTotal: quote.estimatedTotal,
    notes: quote.badges.join(' · '),
  }));

  const comparisonQuotes: ComparisonQuote[] = top.map((quote) => ({
    businessId: quote.uid,
    autoAcceptsAi: quote.autoAcceptsAi,
    businessName: quote.businessName,
    ratePerMeter: quote.ratePerMeter,
    projectTotalMin: quote.projectTotalMin,
    projectTotalMax: quote.projectTotalMax,
    badges: quote.badges,
    warranty: quote.warranty,
    tag: quote.projectTotalMin === cheapest ? 'BEST_VALUE' : null,
    savingsFromAverage: benchmark !== null && benchmark > quote.projectTotalMin ? benchmark - quote.projectTotalMin : null,
    suburb: quote.suburb,
  }));

  return {
    sessionId: gate.sessionId,
    trade: 'fencing',
    intent: existingPrice !== null ? 'compare_quote' : 'new_quote',
    place: gate.place,
    type: 'result',
    message: 'Here are the local businesses that cover your job.',
    options: [],
    results: resultsOut,
    avgRatePerMeter: Math.round(top.reduce((sum, q) => sum + q.ratePerMeter, 0) / top.length),
    comparison: {
      potentialSavings: benchmark !== null && benchmark > cheapest ? benchmark - cheapest : null,
      marketAverage: average,
      totalQuotesScreened: matcher.totalCovering,
      userExistingPrice: existingPrice,
      quotes: comparisonQuotes,
    },
    checklist,
    checklistComplete: true,
    checklistDisplay: gate.checklistDisplay,
    checklistPending: gate.checklistPending,
  };
}
