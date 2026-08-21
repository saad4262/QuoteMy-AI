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
export const clearGeocodeCache = () => cache.clear();

const normalise = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ');

const componentOf = (components: GoogleComponent[], type: string): string | null =>
  components.find((c) => c.types.includes(type))?.short_name ?? null;

interface GoogleComponent {
  short_name: string;
  types: string[];
}

export async function geocode(baseLocation: string | null): Promise<ResolvedLocation | null> {
  if (!baseLocation?.trim()) return null;
  if (!env.GEOCODING_API_KEY) return null; // not configured: leave it null rather than guess

  const key = normalise(baseLocation);
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', baseLocation);
    url.searchParams.set('components', 'country:AU'); // an Australian marketplace
    url.searchParams.set('key', env.GEOCODING_API_KEY);

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const body = (await res.json()) as {
      status: string;
      results?: { geometry: { location: { lat: number; lng: number } }; address_components: GoogleComponent[] }[];
    };

    const hit = body.results?.[0];
    if (body.status !== 'OK' || !hit) {
      logger.info({ baseLocation, status: body.status }, 'could not geocode base location');
      cache.set(key, null);
      return null;
    }

    const resolved: ResolvedLocation = {
      suburb: componentOf(hit.address_components, 'locality'),
      state: componentOf(hit.address_components, 'administrative_area_level_1'),
      postcode: componentOf(hit.address_components, 'postal_code'),
      lat: hit.geometry.location.lat,
      lng: hit.geometry.location.lng,
      source: 'google',
    };

    cache.set(key, resolved);
    return resolved;
  } catch (err) {
    // A geocoding outage must not fail a submission - the business's pricing is still worth having.
    logger.warn({ err, baseLocation }, 'geocoding failed');
    return null;
  }
}
