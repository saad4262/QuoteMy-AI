import { readFileSync } from 'node:fs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/server.js';
import { MemoryRepository, setRepository } from '../../src/store.js';

const app = createApp();
const good = readFileSync('tests/fixtures/description-GOOD-southeast-fencing.txt', 'utf8');
const bad = readFileSync('tests/fixtures/description-BAD-daves-fencing.txt', 'utf8');

/** Everything goes to one route; `action` says what to do. */
const call = (body: Record<string, unknown>) => request(app).post('/api/v1/business').send(body);

beforeEach(() => setRepository(new MemoryRepository()));

describe('action: submit', () => {
  it('approves a complete price list, stores it, and returns what was extracted', async () => {
    const res = await call({ businessUid: 'biz-good', trade: 'fencing', text: good });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.approved).toBe(true);
    expect(res.body.data.status).toBe('verified');
    expect(res.body.data.ratesSaved).toBeGreaterThan(0);
    expect(res.body.data.report).toContain('## Your rates');
    expect(res.body.meta.coverage.rates).toBe(res.body.data.ratesSaved);

    const profile = await call({ action: 'profile', businessUid: 'biz-good' });
    expect(profile.body.data.pricing.status).toBe('verified');
    expect(profile.body.data.pricing.confirmedAt).toBeNull();
    expect(profile.body.data.submissions).toHaveLength(1);
  });

  it('defaults to submit when no action is given', async () => {
    const res = await call({ businessUid: 'biz-default', text: good });
    expect(res.body.data.approved).toBe(true);
  });

  it('rejects a vague price list and stores nothing on the profile', async () => {
    const res = await call({ businessUid: 'biz-bad', text: bad });

    expect(res.status).toBe(200);
    expect(res.body.data.approved).toBe(false);
    expect(res.body.data.status).toBe('unverified');
    expect(res.body.data.missing.length + res.body.data.unclear.length).toBeGreaterThan(0);

    const profile = await call({ action: 'profile', businessUid: 'biz-bad' });
    expect(profile.status).toBe(404);
  });

  it('writes a rejection report a person can act on: reasons grouped under headings', async () => {
    const res = await call({ businessUid: 'biz-bad', text: bad });
    const report: string = res.body.data.report;

    expect(report).toContain('## Why this matters');
    expect(report).toMatch(/## (What is missing|Needs to be clearer)/);
    expect(report.split('\n').filter((l) => l.startsWith('- ')).length).toBeGreaterThanOrEqual(2);
    // Long enough to be actionable, short enough to read on a phone after work.
    expect(res.body.data.reportWordCount).toBeGreaterThan(40);
    expect(res.body.data.reportWordCount).toBeLessThan(250);
  });

  it('returns the identical shape for a ten-item and a two-item business', async () => {
    const small = [
      'Treated pine 1.8m - $85 per metre',
      'Colorbond 1.8m - $110 per metre',
      'Aluminium slat 1.2m - $165 per metre',
      'All prices include GST. Minimum charge is $850.',
    ].join('\n');

    const a = await call({ businessUid: 'biz-a', text: good });
    const b = await call({ businessUid: 'biz-b', text: small });

    expect(a.body.data.approved).toBe(true);
    expect(b.body.data.approved).toBe(true);
    expect(a.body.data.ratesSaved).toBeGreaterThan(b.body.data.ratesSaved);
    expect(Object.keys(b.body.data).sort()).toEqual(Object.keys(a.body.data).sort());
    expect(Object.keys(b.body.data.pricing).sort()).toEqual(Object.keys(a.body.data.pricing).sort());
  });

  it('keeps two businesses data apart', async () => {
    await call({ businessUid: 'biz-one', text: good });

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

  it('rejects an unknown trade with a field-level message', async () => {
    const res = await call({ businessUid: 'biz-x', trade: 'plumbing', text: good });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('bad_request');
  });

  it('rejects an unknown action', async () => {
    const res = await call({ businessUid: 'biz-x', action: 'delete-everything', text: good });
    expect(res.status).toBe(400);
  });
});

describe('status lifecycle', () => {
  it('goes verified -> confirmed only through an explicit confirm', async () => {
    await call({ businessUid: 'biz-c', text: good });

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
    await call({ businessUid: 'biz-d', text: good });
    await call({ action: 'confirm', businessUid: 'biz-d' });
    await call({ businessUid: 'biz-d', text: good });

    const profile = await call({ action: 'profile', businessUid: 'biz-d' });
    expect(profile.body.data.pricing.confirmedAt).toBeNull();
    expect(profile.body.data.submissions).toHaveLength(2);
  });

  it('will not confirm a business that has submitted nothing', async () => {
    expect((await call({ action: 'confirm', businessUid: 'nobody' })).status).toBe(404);
  });
});

describe('health', () => {
  it('reports which model is actually live', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.provider).toBe('mock');
  });
});
