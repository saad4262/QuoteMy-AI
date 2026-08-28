import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UiState } from '../../src/client/schemas.js';

/* The key has to exist before `config.ts` is read, and `geocode.ts` refuses to call Google without
   one - which is exactly what keeps every other suite in this repo off the network. */
process.env.GEOCODING_API_KEY = 'test-key';
const { clearGeocodeCache } = await import('../../src/geocode.js');
const { resolveSuburb } = await import('../../src/client/suburb.js');

const suburbResult = (suburb: string, state: string, postcode: string, lat: number, lng: number, extra: object = {}) => ({
  types: ['locality', 'political'],
  geometry: { location: { lat, lng } },
  address_components: [
    { short_name: suburb, types: ['locality'] },
    { short_name: state, types: ['administrative_area_level_1'] },
    { short_name: postcode, types: ['postal_code'] },
  ],
  ...extra,
});

const google = (results: object[]) =>
  vi.fn(async () => new Response(JSON.stringify({ status: results.length ? 'OK' : 'ZERO_RESULTS', results }), { status: 200 }));

const ui = (over: Partial<UiState> = {}): UiState => ({
  turn: 2,
  cursor: {},
  lastAsked: 'suburb',
  lastQuestion: 'Which suburb is the fence going in? A postcode works too.',
  lastValues: [],
  lastType: 'message',
  fixing: false,
  rejectedPlaces: [],
  nearbyPlaces: {},
  suburbHint: null,
  place: null,
  ...over,
});

describe('resolveSuburb', () => {
  beforeEach(() => clearGeocodeCache());
  afterEach(() => vi.unstubAllGlobals());

  it('answers the question when the name means exactly one place', async () => {
    vi.stubGlobal('fetch', google([suburbResult('Berwick', 'VIC', '3806', -38.0362, 145.3478)]));

    const resolved = await resolveSuburb({ place: null, ui: ui(), message: 'Berwick', suggestedSuburb: 'Berwick' });

    expect(resolved.place).toMatchObject({ suburb: 'Berwick', state: 'VIC', latitude: -38.0362, longitude: 145.3478 });
    expect(resolved.choices).toEqual([]);
  });

  /* The failure this exists to stop is silent: pick the first Richmond and the customer gets a
     quote from businesses 900 km away, with nothing anywhere reporting a problem. */
  it('asks rather than guesses when the name means several places', async () => {
    vi.stubGlobal(
      'fetch',
      google([
        suburbResult('Richmond', 'VIC', '3121', -37.8183, 144.9987),
        suburbResult('Richmond', 'NSW', '2753', -33.5995, 150.7514),
      ]),
    );

    const resolved = await resolveSuburb({ place: null, ui: ui(), message: 'Richmond', suggestedSuburb: 'Richmond' });

    expect(resolved.place).toBeNull();
    expect(resolved.choices.map((choice) => choice.displayLabel)).toEqual(['Richmond, VIC, 3121', 'Richmond, NSW, 2753']);
  });

  it('refuses a street, and refuses anything Google admits it altered', async () => {
    const street = { ...suburbResult('Berwick', 'VIC', '3806', -38.0, 145.3), types: ['route'] };
    const guessed = suburbResult('Berwick', 'VIC', '3806', -38.0, 145.3, { partial_match: true });
    vi.stubGlobal('fetch', google([street, guessed]));

    const resolved = await resolveSuburb({ place: null, ui: ui(), message: 'one point eight metres', suggestedSuburb: null });

    expect(resolved).toEqual({ place: null, choices: [] });
  });

  it('never looks up a suburb that has already been answered', async () => {
    const fetcher = google([suburbResult('Berwick', 'VIC', '3806', -38.0362, 145.3478)]);
    vi.stubGlobal('fetch', fetcher);

    const already = { latitude: -38.0362, longitude: 145.3478, suburb: 'Berwick' };
    expect(await resolveSuburb({ place: already, ui: ui(), message: 'Berwick', suggestedSuburb: 'Berwick' })).toEqual({ place: null, choices: [] });
    expect(await resolveSuburb({ place: null, ui: ui({ place: already }), message: 'Berwick', suggestedSuburb: 'Berwick' })).toEqual({ place: null, choices: [] });
    expect(fetcher).not.toHaveBeenCalled();
  });

  /* Going back to Google for a place we just offered returns the same ambiguous list, and asks the
     same question again, for ever. `mergeAndDecide` already holds the coordinates. */
  it('never looks up one of the places it offered last turn', async () => {
    const fetcher = google([]);
    vi.stubGlobal('fetch', fetcher);

    const offered = ui({
      nearbyPlaces: {
        'richmond-vic-3121': { latitude: -37.8183, longitude: 144.9987, suburb: 'Richmond', state: 'VIC', postcode: '3121', displayLabel: 'Richmond, VIC, 3121' },
      },
    });
    const resolved = await resolveSuburb({ place: null, ui: offered, message: 'Richmond, VIC, 3121', suggestedSuburb: null });

    expect(resolved).toEqual({ place: null, choices: [] });
    expect(fetcher).not.toHaveBeenCalled();
  });

  /* "3000" on the length question is three kilometres of fence, not Melbourne's CBD. */
  it('reads four digits as a postcode only while the suburb is what was asked', async () => {
    const fetcher = google([suburbResult('Melbourne', 'VIC', '3000', -37.8136, 144.9631)]);
    vi.stubGlobal('fetch', fetcher);

    const onLength = await resolveSuburb({ place: null, ui: ui({ lastAsked: 'lengthMeters' }), message: '3000', suggestedSuburb: null });
    expect(onLength).toEqual({ place: null, choices: [] });
    expect(fetcher).not.toHaveBeenCalled();

    const onSuburb = await resolveSuburb({ place: null, ui: ui(), message: '3000', suggestedSuburb: null });
    expect(onSuburb.place).toMatchObject({ suburb: 'Melbourne', postcode: '3000' });
  });

  it('does not offer a suburb the customer has already been told nobody covers', async () => {
    vi.stubGlobal('fetch', google([suburbResult('Berwick', 'VIC', '3806', -38.0362, 145.3478)]));

    const resolved = await resolveSuburb({
      place: null,
      ui: ui({ rejectedPlaces: ['berwick-vic-3806'] }),
      message: 'Berwick',
      suggestedSuburb: 'Berwick',
    });

    expect(resolved).toEqual({ place: null, choices: [] });
  });
});
