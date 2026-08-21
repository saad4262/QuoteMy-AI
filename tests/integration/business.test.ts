import { readFileSync } from 'node:fs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/server.js';
import { MemoryRepository, setRepository } from '../../src/store.js';
import { clearTranscriptCache } from '../../src/ingest.js';

const app = createApp();
// `complete` satisfies every blocking rule. `good` is a well-written price list that does NOT -
// no build specs, no permits position, no warranty - and is kept for exactly that contrast.
const complete = readFileSync('tests/fixtures/description-COMPLETE-fencing.txt', 'utf8');
const good = readFileSync('tests/fixtures/description-GOOD-southeast-fencing.txt', 'utf8');
const bad = readFileSync('tests/fixtures/description-BAD-daves-fencing.txt', 'utf8');

/** Everything goes to one route; `action` says what to do. */
const call = (body: Record<string, unknown>) => request(app).post('/api/v1/business').send(body);

beforeEach(() => setRepository(new MemoryRepository()));

describe('action: submit', () => {
  it('approves a complete price list, stores it, and returns what was extracted', async () => {
    const res = await call({ businessUid: 'biz-good', trade: 'fencing', text: complete });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.approved).toBe(true);
    expect(res.body.data.status).toBe('verified');
    expect(res.body.data.business.ratesSaved).toBeGreaterThan(0);
    expect(res.body.data.business.pricing.rates.timber_pine).toBeTruthy();
    // no markdown anywhere - both screens render the same structured fields their own way
    expect(res.body.data.business.report).toBeUndefined();
    expect(res.body.data.admin.report).toBeUndefined();
    expect(res.body.data.business.labels.timber_pine).toBe('Treated pine');
    expect(res.body.data.admin.coverage.rates).toBe(res.body.data.business.ratesSaved);

    const profile = await call({ action: 'profile', businessUid: 'biz-good' });
    expect(profile.body.data.pricing.status).toBe('verified');
    expect(profile.body.data.pricing.confirmedAt).toBeNull();
    expect(profile.body.data.submissions).toHaveLength(1);
  });

  it('defaults to submit when no action is given', async () => {
    const res = await call({ businessUid: 'biz-default', text: complete });
    expect(res.body.data.approved).toBe(true);
  });

  it('rejects a vague price list and stores nothing on the profile', async () => {
    const res = await call({ businessUid: 'biz-bad', text: bad });

    expect(res.status).toBe(200);
    expect(res.body.data.approved).toBe(false);
    expect(res.body.data.status).toBe('unverified');
    expect(res.body.data.business.fixes.length).toBeGreaterThan(0);
    expect(res.body.data.admin.fixCounts.missing).toBeGreaterThan(0);

    const profile = await call({ action: 'profile', businessUid: 'biz-bad' });
    expect(profile.status).toBe(404);
  });

  it('hands the business three things: an opening, the jobs to do, and what happens next', () => 
    call({ businessUid: 'biz-bad', text: bad }).then((res) => {
      const { business, admin } = res.body.data;

      expect(Object.keys(business).sort()).toEqual(
        ['alsoWorthAdding', 'fixes', 'nextStep', 'notUsed', 'opening', 'source'],
      );
      expect(business.opening).toBeTruthy();
      expect(business.nextStep).toContain('contact button below');

      // every fix is a job, split into the two kinds so the screen can head them separately
      expect(business.fixes.length).toBeGreaterThanOrEqual(2);
      for (const fix of business.fixes) expect(['missing', 'unclear']).toContain(fix.kind);

      expect(admin.fixCounts.missing + admin.fixCounts.unclear).toBe(business.fixes.length);
    }));

  it('returns the identical shape for a ten-item and a two-item business', async () => {
    // Fewer rates than `complete`, but it still answers every blocking item - which is the point:
    // a small profile and a large one must come back in the same shape.
    const small = [
      'Treated pine 1.8m - $85 per metre',
      'Treated pine 2.1m - $104 per metre',
      'Colorbond 1.8m - $110 per metre',
      'All prices include GST. Minimum charge is $850. Based in Berwick, we travel 30km,',
      'no travel charge inside that.',
      'Gates: single pedestrian $480, double driveway $1,340.',
      'Removal of an old timber fence: $18 per metre.',
      'Sloped blocks +$14/m. Rock or hand-dig +$22/m. Restricted access +$9/m.',
      'Posts are 100x100mm H4 pine at 2.4m centres, 700mm deep in concrete, 300mm holes,',
      '3 rails of 75x50mm per bay, no capping. Colorbond uses the manufacturer system.',
      'Council permits are the customer\'s responsibility. Workmanship warranted 7 years.',
    ].join('\n');

    const a = await call({ businessUid: 'biz-a', text: complete });
    const b = await call({ businessUid: 'biz-b', text: small });

    expect(a.body.data.approved).toBe(true);
    expect(b.body.data.approved).toBe(true);
    expect(a.body.data.business.ratesSaved).toBeGreaterThan(b.body.data.business.ratesSaved);
    expect(Object.keys(b.body.data).sort()).toEqual(Object.keys(a.body.data).sort());
    expect(Object.keys(b.body.data.business).sort()).toEqual(Object.keys(a.body.data.business).sort());
    expect(Object.keys(b.body.data.business.pricing).sort()).toEqual(Object.keys(a.body.data.business.pricing).sort());
  });

  it('keeps two businesses data apart', async () => {
    await call({ businessUid: 'biz-one', text: complete });

    expect((await call({ action: 'profile', businessUid: 'biz-two' })).status).toBe(404);
    expect((await call({ action: 'profile', businessUid: 'biz-one' })).status).toBe(200);
  });
});

describe('input handling', () => {
  const cases: [string, string, number, string][] = [
    ['empty text', '', 422, 'unprocessable'],
    ['too short', '$95/m', 422, 'unprocessable'],
    ['no digits at all', 'We do all kinds of fencing, give us a call and we can have a chat', 422, 'unprocessable'],
  ];

  for (const [name, text, status, code] of cases) {
    it(`rejects ${name} in code, before any model call`, async () => {
      const res = await call({ businessUid: 'biz-x', text });
      expect(res.status).toBe(status);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe(code);
      expect(res.body.requestId).toBeTruthy();
    });
  }

  it('answers a mashed keyboard with the checklist, and pays nothing to do it', async () => {
    const res = await call({
      businessUid: 'biz-mash',
      text: 'wbjsdabjdsajkdajksdjkfadsjk asdkjhaskjdh kjsdfhkjsdf jkhsdfkjh sdkfjhsdkjf 12 241',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.admin.decision).toBe('not_a_price_list');
    expect(res.body.meta.stages).toHaveLength(0); // the model was never asked
    expect(res.body.meta.costUsd).toBe(0);
    expect(res.body.data.business.whatToSend.need.length).toBeGreaterThan(3);
    expect(res.body.data.business.whatToSend.example).toContain('per metre');
  });

  it('does not mistake a real price list for mashed keys', async () => {
    const res = await call({ businessUid: 'biz-real', text: complete });
    expect(res.body.data.approved).toBe(true);
  });

  it('says something different when there was no price list to assess at all', async () => {
    const res = await call({
      businessUid: 'biz-chat',
      text: 'Hi there, just wondering if you blokes cover the eastern suburbs at all? Cheers, Dave. 0400 000 000',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.approved).toBe(false);
    expect(res.body.data.admin.decision).toBe('not_a_price_list');
    // not "a few things need updating" - that would read as though we had not looked
    expect(res.body.data.business.opening).toMatch(/this page is for your pricing/i);
    // and it says what to send, taken from the same SOP rules the review judges against
    expect(res.body.data.business.whatToSend.need[0]).toMatch(/price per metre/i);
  });

  it('rejects an unknown trade with a field-level message', async () => {
    const res = await call({ businessUid: 'biz-x', trade: 'plumbing', text: complete });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('bad_request');
  });

  it('rejects an unknown action', async () => {
    const res = await call({ businessUid: 'biz-x', action: 'delete-everything', text: complete });
    expect(res.status).toBe(400);
  });
});

describe('status lifecycle', () => {
  it('goes verified -> confirmed only through an explicit confirm', async () => {
    await call({ businessUid: 'biz-c', text: complete });

    const before = await call({ action: 'profile', businessUid: 'biz-c' });
    expect(before.body.data.pricing.confirmedAt).toBeNull();
    expect(before.body.meta.live).toBe(false);

    const confirmed = await call({ action: 'confirm', businessUid: 'biz-c' });
    expect(confirmed.body.data.pricing.status).toBe('confirmed');
    expect(confirmed.body.data.pricing.confirmedAt).toBeTruthy();

    const again = await call({ action: 'confirm', businessUid: 'biz-c' });
    expect(again.body.data.alreadyConfirmed).toBe(true);
  });

  it('clears a previous confirmation when new pricing is submitted', async () => {
    await call({ businessUid: 'biz-d', text: complete });
    await call({ action: 'confirm', businessUid: 'biz-d' });
    await call({ businessUid: 'biz-d', text: complete });

    const profile = await call({ action: 'profile', businessUid: 'biz-d' });
    expect(profile.body.data.pricing.confirmedAt).toBeNull();
    expect(profile.body.data.submissions).toHaveLength(2);
  });

  it('will not confirm a business that has submitted nothing', async () => {
    expect((await call({ action: 'confirm', businessUid: 'nobody' })).status).toBe(404);
  });
});

describe('file uploads', () => {
  beforeEach(clearTranscriptCache);

  const attach = (name: string, field: Record<string, string> = {}) => {
    const req = request(app).post('/api/v1/business');
    for (const [key, value] of Object.entries({ businessUid: 'biz-files', trade: 'fencing', ...field })) {
      req.field(key, value);
    }
    return req.attach('files', `tests/fixtures/${name}`);
  };

  it('accepts a text file on its own and reads it without a model call', async () => {
    const res = await attach('rates.txt');

    expect(res.status).toBe(200);
    expect(res.body.data.approved).toBe(true);
    expect(res.body.data.business.source.documents).toEqual([
      { label: 'rates.txt', kind: 'text', readBy: 'text', chars: expect.any(Number), unreadable: false },
    ]);
    // read from the bytes, so nothing was spent on an ingest stage
    expect(res.body.meta.stages.map((s: { name: string }) => s.name)).not.toContain('transcribe');
  });

  it('takes a PDF through the transcription stage and says a model read it', async () => {
    const res = await attach('rate-card.pdf');

    expect(res.status).toBe(200);
    expect(res.body.data.business.source.documents[0]).toMatchObject({
      label: 'rate-card.pdf',
      kind: 'pdf',
      readBy: 'model',
    });
    expect(res.body.meta.stages[0].name).toBe('transcribe');
  });

  it('accepts typed text and a file in the same submission', async () => {
    const res = await attach('rates.txt', { text: 'We also do custom gates, priced on the day.' });

    expect(res.status).toBe(200);
    expect(res.body.data.business.source.documents.map((d: { label: string }) => d.label)).toEqual([
      'typed',
      'rates.txt',
    ]);
  });

  it('gives the admin view the transcript everything was checked against', async () => {
    const res = await attach('rates.txt');
    expect(res.body.data.admin.sourceText).toContain('$85 per metre');
  });

  it('turns a HEIC away with a readable message, not a 500', async () => {
    const res = await request(app)
      .post('/api/v1/business')
      .field('businessUid', 'biz-heic')
      .attach('files', Buffer.concat([Buffer.alloc(4), Buffer.from('ftypheic'), Buffer.alloc(32)]), 'IMG_1.HEIC');

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('unsupported_file_type');
    expect(res.body.error.message).toMatch(/JPEG/);
  });

  it('names a file it could not read instead of quietly ignoring it', async () => {
    const res = await attach('rate-card.png', {
      text: complete,
    });

    expect(res.body.data.approved).toBe(true);
    // the picture was read as nothing - saying nothing about it would let them believe it was used
    expect(res.body.data.business.notUsed.join(' ')).toContain('rate-card.png');
    expect(res.body.data.business.source.documents[1].unreadable).toBe(true);
  });

  it('says so plainly when a file carries nothing readable', async () => {
    const res = await attach('rate-card.png'); // the mock cannot read pictures, and says so

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('unprocessable');
  });

  it('still accepts a plain JSON submission with no files at all', async () => {
    const res = await call({ businessUid: 'biz-json', text: complete });
    expect(res.body.data.approved).toBe(true);
    expect(res.body.data.business.source.documents).toEqual([
      { label: 'typed', kind: 'text', readBy: 'text', chars: expect.any(Number), unreadable: false },
    ]);
  });
});

describe('health', () => {
  it('reports which model is actually live', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.provider).toBe('mock');
    expect(res.body.data.store).toBe('memory');
  });
});

describe('action: process', () => {
  it('refuses to run against the memory store', async () => {
    const res = await call({ action: 'process', businessUid: 'biz-p' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('bad_request');
  });
});

describe('unknown routes', () => {
  it('answers 404, not 500, and says which path was wrong', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not_found');
    expect(res.body.error.message).toContain('GET /');
  });
});

describe('what would make the profile stronger', () => {
  it('tells a thin submission what it is missing beyond the one blocking rule', async () => {
    const thin = [
      'Southeast Fencing - rate card',
      'Treated pine 1.8m high - $85 per metre',
      'Colorbond 1.8m high - $110 per metre',
      'All prices include GST. Minimum charge is $850.',
    ].join('\n');

    const res = await call({ businessUid: 'biz-thin', text: thin });
    const { business } = res.body.data;

    // the point: one blocking fix is not the whole story for a four-line price list
    expect(business.alsoWorthAdding.length).toBeGreaterThan(0);
    expect(business.alsoWorthAdding.join(' ')).toMatch(/gate/i);

    // and it must never be counted as a reason the submission was sent back
    for (const item of business.alsoWorthAdding) {
      expect(business.fixes.map((f: { what: string }) => f.what)).not.toContain(item);
    }
  });

  it('is present on an approved submission too - that is the one nothing else tells', async () => {
    const res = await call({ businessUid: 'biz-approved-thin', text: complete });
    expect(res.body.data.approved).toBe(true);
    expect(res.body.data.business).toHaveProperty('alsoWorthAdding');
  });
});
