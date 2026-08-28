import { env, logger } from './config.js';

/**
 * `baseLocation` is what the business typed: "Berwick", "Berwick VIC 3806", "berwick". Customer
 * matching is distance from that point, and free text cannot answer that.
 *
 * Resolved once, here, and kept beside the original words - we never replace what they wrote.
 * When it cannot be resolved the answer is null, never a guess: an invented coordinate would put a
 * business in front of customers it cannot reach, and nothing would ever report it.
 */

export interface ResolvedLocation {
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  lat: number;
  lng: number;
  source: 'google';
}

/**
 * Most businesses in a trade sit in a handful of suburbs, so the same few strings resolve over and
 * over. Keyed by the normalised text, so "Berwick", "berwick" and " Berwick " are one lookup.
 */
const cache = new Map<string, ResolvedLocation | null>();
export const clearGeocodeCache = () => {
  cache.clear();
  candidateCache.clear();
};

const normalise = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');

const componentOf = (components: GoogleComponent[], type: string): string | null =>
  components.find((c) => c.types.includes(type))?.short_name ?? null;

interface GoogleComponent {
  short_name: string;
  types: string[];
}

interface GoogleResult {
  types: string[];
  /** Google's own admission that it changed the query to get an answer. */
  partial_match?: boolean;
  geometry: { location: { lat: number; lng: number } };
  address_components: GoogleComponent[];
}

async function lookupAll(address: string): Promise<GoogleResult[]> {
  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('address', address);
  url.searchParams.set('components', 'country:AU'); // an Australian marketplace
  url.searchParams.set('key', env.GEOCODING_API_KEY!);

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  const body = (await res.json()) as { status: string; results?: GoogleResult[] };

  if (body.status !== 'OK' || !body.results?.length) {
    // REQUEST_DENIED almost always means a key restricted to HTTP referrers - one made for the
    // browser. A server needs an IP-restricted key, or none. It is not a billing problem.
    const level = body.status === 'REQUEST_DENIED' ? 'error' : 'info';
    logger[level]({ address, status: body.status }, 'could not geocode');
    return [];
  }
  return body.results;
}

const lookup = async (address: string): Promise<GoogleResult | null> => (await lookupAll(address))[0] ?? null;

const toResolved = (hit: GoogleResult): ResolvedLocation => ({
  suburb: componentOf(hit.address_components, 'locality'),
  state: componentOf(hit.address_components, 'administrative_area_level_1'),
  postcode: componentOf(hit.address_components, 'postal_code'),
  lat: hit.geometry.location.lat,
  lng: hit.geometry.location.lng,
  source: 'google',
});

export async function geocode(baseLocation: string | null): Promise<ResolvedLocation | null> {
  if (!baseLocation?.trim()) return null;
  if (!env.GEOCODING_API_KEY) return null; // not configured: leave it null rather than guess

  const key = normalise(baseLocation);
  if (cache.has(key)) return cache.get(key) ?? null;

  try {

    let hit = await lookup(baseLocation);

    /**
     * A postcode wins over a suburb name, and returns the postcode's centroid - so "Berwick VIC
     * 3806" comes back as Harkaway, a different suburb that shares 3806. The distance is off by
     * about a kilometre, which does not matter, but the suburb is simply wrong, which does.
     *
     * The business wrote the suburb, so ask for the suburb: drop the digits and look again. Only
     * happens when a postcode was included, and the answer is cached like any other.
     */
    if (hit?.types.includes('postal_code')) {
      const withoutPostcode = baseLocation.replace(/\b\d{4}\b/g, '').trim();
      if (withoutPostcode && /[a-z]/i.test(withoutPostcode)) {
        const bySuburb = await lookup(withoutPostcode);
        if (bySuburb?.types.includes('locality')) hit = bySuburb;
      }
    }
    if (!hit) {
      cache.set(key, null);
      return null;
    }

    const resolved = toResolved(hit);

    cache.set(key, resolved);
    return resolved;
  } catch (err) {
    // A geocoding outage must not fail a submission - the business's pricing is still worth having.
    logger.warn({ err, baseLocation }, 'geocoding failed');
    return null;
  }
}

/**
 * A place a customer named, resolved to the suburbs it could actually be.
 *
 * `geocode` above answers a business's own address, which a human typed and checked. This answers
 * a customer's - spoken down a phone line, or typed with one thumb - and the difference is the
 * whole of this function. Google will always find something: ask it for "one point eight metres"
 * and it returns a street somewhere, confidently, with coordinates. So only a result Google itself
 * calls a suburb or a postcode is accepted, `partial_match` is refused outright, and a name it
 * cannot place comes back as an empty list rather than as the nearest thing.
 *
 * More than one is not a failure - Australia has a Richmond in four states. They are all returned,
 * and the customer picks. Guessing between them is the one thing that must not happen here: the
 * wrong Richmond does not read as an error, it reads as a quote from businesses 900 km away.
 */
const SUBURB_TYPES = ['locality', 'sublocality', 'postal_code'];

const candidateCache = new Map<string, ResolvedLocation[]>();

export async function suburbCandidates(spoken: string | null, limit = 3): Promise<ResolvedLocation[]> {
  const text = spoken?.trim();
  if (!text || text.length < 3) return [];
  if (!env.GEOCODING_API_KEY) return []; // not configured: no place, rather than a guessed one

  const key = normalise(text);
  const cached = candidateCache.get(key);
  if (cached) return cached;

  try {
    let hits = await lookupAll(text);

    /* A postcode outranks a suburb name in the same query, and what comes back is the postcode's
       centroid - which is regularly a different suburb that happens to share it. "Berwick 3806"
       resolves to Harkaway. The customer said Berwick, so ask for Berwick: drop the digits and
       look again, and only keep that answer if it is a suburb. Same trap `geocode` handles for a
       business's own address, and it matters more here - a customer says the postcode BECAUSE the
       question asked for one. */
    if (hits[0]?.types.includes('postal_code')) {
      const withoutPostcode = text.replace(/\b\d{4}\b/g, '').replace(/\s+/g, ' ').trim();
      if (withoutPostcode && /[a-z]/i.test(withoutPostcode)) {
        const bySuburb = await lookupAll(withoutPostcode);
        if (bySuburb.some((hit) => hit.types.includes('locality'))) hits = bySuburb;
      }
    }

    const seen = new Set<string>();
    const found: ResolvedLocation[] = [];

    for (const hit of hits) {
      if (hit.partial_match) continue;
      if (!hit.types.some((type) => SUBURB_TYPES.includes(type))) continue;
      const resolved = toResolved(hit);
      // No suburb name means nothing to read out and nothing to show on the confirmation.
      if (!resolved.suburb) continue;
      const identity = normalise(resolved.suburb + ' ' + (resolved.state ?? ''));
      if (seen.has(identity)) continue;
      seen.add(identity);
      found.push(resolved);
      if (found.length >= limit) break;
    }

    candidateCache.set(key, found);
    return found;
  } catch (err) {
    // Same trade as `geocode`: a Google outage costs the customer the picker, not the conversation.
    logger.warn({ err, spoken: text }, 'could not resolve a suburb');
    return [];
  }
}
