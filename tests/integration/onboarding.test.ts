import { readFileSync } from 'node:fs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/server.js';
import { MemoryRepository } from '../../src/store.js';
import { setRepository } from '../../src/store.js';

const app = createApp();
const good = readFileSync('tests/fixtures/description-GOOD-southeast-fencing.txt', 'utf8');
const bad = readFileSync('tests/fixtures/description-BAD-daves-fencing.txt', 'utf8');

const as = (uid: string) => ({ 'x-debug-uid': uid });
const post = (path: string, uid: string, body: unknown) => request(app).post(path).set(as(uid)).send(body);

beforeEach(() => setRepository(new MemoryRepository()));

describe('POST /api/v1/business/onboarding', () => {
  it('approves a complete price list, stores it, and returns it as verified', async () => {
    const res = await post('/api/v1/business/onboarding', 'biz-good', { trade: 'fencing', text: good });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.approved).toBe(true);
    expect(res.body.data.status).toBe('verified');
    expect(res.body.data.ratesSaved).toBeGreaterThan(0);
    expect(res.body.data.report).toContain('## Your rates');
    expect(res.body.meta.store).toBe('memory');
    expect(res.body.meta.coverage.rates).toBe(res.body.data.ratesSaved);

    const profile = await request(app).get('/api/v1/business/profile/fencing').set(as('biz-good'));
    expect(profile.body.data.pricing.status).toBe('verified');
    expect(profile.body.data.pricing.confirmedAt).toBeNull();
    expect(profile.body.data.submissions).toHaveLength(1);
  });

  it('rejects a submission with no firm rates and stores nothing on the profile', async () => {
    const res = await post('/api/v1/business/onboarding', 'biz-bad', { trade: 'fencing', text: bad });

    expect(res.status).toBe(200);
    expect(res.body.data.approved).toBe(false);
    expect(res.body.data.status).toBe('unverified');
    expect(res.body.data.fixes.length).toBeGreaterThan(0);
    expect(res.body.data.reportWordCount).toBeLessThan(250);

    const profile = await request(app).get('/api/v1/business/profile/fencing').set(as('biz-bad'));
    expect(profile.status).toBe(404);
  });

  it('returns the identical envelope shape for a ten-item and a two-item business', async () => {
    const small = [
      'Treated pine 1.8m - $85 per metre',
      'Colorbond 1.8m - $110 per metre',
      'Aluminium slat 1.2m - $165 per metre',
      'All prices include GST. Minimum charge is $850.',
    ].join('\n');
    const a = await post('/api/v1/business/onboarding', 'biz-a', { trade: 'fencing', text: good });
    const b = await post('/api/v1/business/onboarding', 'biz-b', { trade: 'fencing', text: small });

    expect(a.body.data.approved).toBe(true);
    expect(b.body.data.approved).toBe(true);
    expect(a.body.data.ratesSaved).toBeGreaterThan(b.body.data.ratesSaved);
    expect(Object.keys(b.body).sort()).toEqual(Object.keys(a.body).sort());
    expect(Object.keys(b.body.data).sort()).toEqual(Object.keys(a.body.data).sort());
    expect(Object.keys(b.body.data.pricing).sort()).toEqual(Object.keys(a.body.data.pricing).sort());
  });

  it('never takes businessUid from the body', async () => {
    await post('/api/v1/business/onboarding', 'real-owner', {
      trade: 'fencing',
      text: good,
      businessUid: 'someone-else',
    });

    const victim = await request(app).get('/api/v1/business/profile/fencing').set(as('someone-else'));
    expect(victim.status).toBe(404);

    const owner = await request(app).get('/api/v1/business/profile/fencing').set(as('real-owner'));
    expect(owner.status).toBe(200);
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
      const res = await post('/api/v1/business/onboarding', 'biz-x', { trade: 'fencing', text });
      expect(res.status).toBe(status);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe(code);
      expect(res.body.requestId).toBeTruthy();
    });
  }

  it('rejects an unknown trade with a field-level message', async () => {
    const res = await post('/api/v1/business/onboarding', 'biz-x', { trade: 'plumbing', text: good });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('bad_request');
  });

  it('rejects a request with no identity', async () => {
    const res = await request(app).post('/api/v1/business/onboarding').send({ trade: 'fencing', text: good });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('unauthorized');
  });
});

describe('status lifecycle', () => {
  it('goes verified -> confirmed only through an explicit confirm call', async () => {
    await post('/api/v1/business/onboarding', 'biz-c', { trade: 'fencing', text: good });

    const before = await request(app).get('/api/v1/business/profile/fencing').set(as('biz-c'));
    expect(before.body.data.pricing.confirmedAt).toBeNull();
    expect(before.body.meta.live).toBe(false);

    const confirm = await request(app).post('/api/v1/business/profile/fencing/confirm').set(as('biz-c'));
    expect(confirm.status).toBe(200);
    expect(confirm.body.data.pricing.status).toBe('confirmed');
    expect(confirm.body.data.pricing.confirmedAt).toBeTruthy();

    const again = await request(app).post('/api/v1/business/profile/fencing/confirm').set(as('biz-c'));
    expect(again.body.data.alreadyConfirmed).toBe(true);
  });

  it('clears a previous confirmation when new pricing is submitted', async () => {
    await post('/api/v1/business/onboarding', 'biz-d', { trade: 'fencing', text: good });
    await request(app).post('/api/v1/business/profile/fencing/confirm').set(as('biz-d'));
    await post('/api/v1/business/onboarding', 'biz-d', { trade: 'fencing', text: good });

    const profile = await request(app).get('/api/v1/business/profile/fencing').set(as('biz-d'));
    expect(profile.body.data.pricing.confirmedAt).toBeNull();
    expect(profile.body.data.pricing.status).toBe('verified');
    expect(profile.body.data.submissions).toHaveLength(2);
  });

  it('refuses to confirm pricing that could not be verified', async () => {
    const res = await request(app).post('/api/v1/business/profile/fencing/confirm').set(as('nobody'));
    expect(res.status).toBe(404);
  });
});

describe('supporting routes', () => {
  it('serves the vocabulary the frontend renders from', async () => {
    const res = await request(app).get('/api/v1/vocab/fencing');
    expect(res.body.data.materials).toContain('timber_pine');
    expect(res.body.data.bounds.pricePerMetre.max).toBe(2000);
  });

  it('404s an unknown trade in the same envelope', async () => {
    const res = await request(app).get('/api/v1/vocab/plumbing');
    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it('answers health without auth', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body.data.status).toBe('ok');
  });
});
