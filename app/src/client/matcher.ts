import type { BusinessRepository, ServiceExtract } from '../store.js';
import type { Trade } from '../vocab.js';
import { slug } from './fuzzyMatch.js';
import type { Place } from './schemas.js';

/**
 * Which businesses whose own service area reaches this customer, paired with the document each
 * of them published for this trade. Ported from n8n's `Match & Pair (v2)` node in
 * `shared_matcher.json` - the drop reasons and the distance test are unchanged.
 *
 * One simplification versus the n8n version: it read businesses via a batch Firestore read and
 * had to pair each result back to a business by `_name` (falling back to array position, a
 * documented mispairing risk). Here `getServiceExtract` is called per candidate UID directly, so
 * there is nothing to pair - each read is already tied to the business it came from.
 */

export interface NearbyArea {
  suburb: string;
  state: string | null;
  postcode: string | null;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  distanceKm: number;
}

export interface MatchedBusiness {
  uid: string;
  businessName: string;
  rating: number | null;
  reviewCount: number | null;
  isAutoAcceptEnabled: boolean;
  autoAcceptsAi: boolean;
  distanceMeters: number;
  distanceKm: number;
  suburb: string;
}

export interface MatchDiagnostics {
  candidates: number;
  errored: number;
  notConfirmed: number;
  noCoords: number;
  outsideRadius: number;
  excluded: number;
}

export interface MatchResult {
  matched: boolean;
  noMatchReason: 'place' | 'radius' | 'pricing' | 'suburb' | 'area' | null;
  businesses: MatchedBusiness[];
  /** Index-aligned with `businesses`. */
  pricing: ServiceExtract[];
  /** Every business that covers them, including ones that cannot quote this particular job. */
  totalCovering: number;
  /** Suburbs this trade is actually worked out of nearby, nearest first, capped at 6. */
  nearby: NearbyArea[];
  diagnostics: MatchDiagnostics;
}

/** Haversine, in metres. A spherical earth is well inside the error a 30km service radius already tolerates. */
function distanceMeters(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const R = 6371000;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(toLat - fromLat);
  const dLng = rad(toLng - fromLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(fromLat)) * Math.cos(rad(toLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function emptyDiagnostics(candidates: number): MatchDiagnostics {
  return { candidates, errored: 0, notConfirmed: 0, noCoords: 0, outsideRadius: 0, excluded: 0 };
}

/**
 * How many service documents to read at once.
 *
 * Reading them one after another cost a full round trip per business - twenty of them is two to
 * three seconds on the confirm turn, which is the one turn a customer is already waiting on. An
 * unbounded `Promise.all` is the other mistake: a serverless function shares 1,024 file descriptors
 * across every concurrent execution, and a few hundred businesses would exhaust them.
 */
const READ_BATCH = 25;

/**
 * A read that failed and one that found nothing are the same answer here, and are counted alike.
 * `Priced` carries the narrowing the old inline check did, so nothing downstream re-tests it.
 */
type Priced = ServiceExtract & { pricing: NonNullable<ServiceExtract['pricing']> };
type Read = Priced | 'unusable';

async function readExtract(repo: BusinessRepository, uid: string, trade: Trade): Promise<Read> {
  try {
    const extract = await repo.getServiceExtract(uid, trade);
    // No document for this trade yet is the same as a business that never finished setting up its
    // pricing - counted rather than ignored, so "nobody covers you" can be told apart from "every
    // read errored".
    return extract && extract.pricing ? (extract as Priced) : 'unusable';
  } catch {
    return 'unusable';
  }
}

export async function matchBusinesses(
  trade: Trade,
  place: Place | null,
  checklistSuburb: string | null,
  repo: BusinessRepository,
): Promise<MatchResult> {
  if (!place || !Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
    return { matched: false, noMatchReason: 'place', businesses: [], pricing: [], totalCovering: 0, nearby: [], diagnostics: emptyDiagnostics(0) };
  }

  const candidates = await repo.findCandidates(trade);
  const customerKeys = [place.suburb, place.name, place.postcode, checklistSuburb].filter((v): v is string => Boolean(v)).map(slug);

  const matches: { business: MatchedBusiness; extract: ServiceExtract }[] = [];
  const covered: NearbyArea[] = [];
  const dropped = { errored: 0, notConfirmed: 0, noCoords: 0, outsideRadius: 0, excluded: 0 };

  /* Reading is the slow part, so it happens in parallel; every decision below stays sequential and
     in candidate order, so the same businesses come out in the same order they always did. */
  const named = candidates.filter((candidate) => candidate.uid);
  const reads: Read[] = [];
  for (let i = 0; i < named.length; i += READ_BATCH) {
    const batch = named.slice(i, i + READ_BATCH);
    reads.push(...(await Promise.all(batch.map((candidate) => readExtract(repo, candidate.uid, trade)))));
  }

  for (const [index, candidate] of named.entries()) {
    const extract = reads[index]!;
    if (extract === 'unusable') {
      dropped.errored += 1;
      continue;
    }
    // This document's OWN status is authoritative, never a possibly-stale mirror elsewhere.
    if (extract.status !== 'confirmed') {
      dropped.notConfirmed += 1;
      continue;
    }

    const area = extract.pricing.serviceArea;
    const resolved = area.resolved;
    const areaLat = resolved?.lat ?? null;
    const areaLng = resolved?.lng ?? null;
    const radiusMetres = area.radiusKm !== null ? area.radiusKm * 1000 : null;
    // A business isn't dropped just because its geocode never resolved is wrong to assume away -
    // it genuinely cannot be matched without coordinates, so it is dropped, but counted separately
    // from "hasn't set up pricing" so the two can be told apart when nobody matches.
    if (areaLat === null || areaLng === null || radiusMetres === null) {
      dropped.noCoords += 1;
      continue;
    }

    const distance = distanceMeters(place.latitude, place.longitude, areaLat, areaLng);
    if (resolved?.suburb) {
      covered.push({
        suburb: resolved.suburb,
        state: resolved.state ?? null,
        postcode: resolved.postcode ?? null,
        latitude: areaLat,
        longitude: areaLng,
        distanceMeters: Math.round(distance),
        distanceKm: Math.round(distance / 100) / 10,
      });
    }

    // Excluded areas are free text in the business's own words - matched loosely, in both
    // directions: "frankston" excludes "Frankston South", and "the peninsula" is caught by a
    // customer suburb that appears inside it.
    const excluded = area.excludedAreas.map(slug).filter((entry) => entry.length > 2);
    const excludedHere = excluded.some((entry) => customerKeys.some((key) => key.length > 2 && (entry.includes(key) || key.includes(entry))));
    if (excludedHere) {
      dropped.excluded += 1;
      continue;
    }

    if (distance > radiusMetres) {
      dropped.outsideRadius += 1;
      continue;
    }

    matches.push({
      business: {
        uid: candidate.uid,
        businessName: candidate.businessName,
        rating: candidate.rating,
        reviewCount: candidate.reviewCount,
        isAutoAcceptEnabled: candidate.isAutoAcceptEnabled,
        autoAcceptsAi: candidate.isAiAutoAcceptEnabled,
        distanceMeters: Math.round(distance),
        distanceKm: Math.round(distance / 100) / 10,
        suburb: place.displayLabel || checklistSuburb || '',
      },
      extract,
    });
  }

  // The suburbs this trade is actually worked out of, nearest first, one entry each - offered to
  // a customer nobody covers so the conversation has somewhere to go.
  const nearby: NearbyArea[] = [];
  const seenSuburb = new Set<string>();
  for (const area of covered.sort((a, b) => a.distanceMeters - b.distanceMeters)) {
    const key = slug(area.suburb);
    if (!key || seenSuburb.has(key)) continue;
    seenSuburb.add(key);
    nearby.push(area);
    if (nearby.length >= 6) break;
  }

  if (matches.length === 0) {
    return {
      matched: false,
      noMatchReason: dropped.outsideRadius > 0 || dropped.excluded > 0 ? 'radius' : dropped.notConfirmed > 0 ? 'pricing' : 'suburb',
      businesses: [],
      pricing: [],
      totalCovering: 0,
      nearby,
      diagnostics: { candidates: candidates.length, ...dropped },
    };
  }

  // Nearest first, so the list reads sensibly if anything shows it unsorted. Price, not distance,
  // decides the actual ranking - that happens in priceAndRank.ts.
  matches.sort((a, b) => a.business.distanceMeters - b.business.distanceMeters);

  return {
    matched: true,
    noMatchReason: null,
    businesses: matches.map((m) => m.business),
    pricing: matches.map((m) => m.extract),
    totalCovering: matches.length,
    nearby,
    diagnostics: { candidates: candidates.length, ...dropped },
  };
}
