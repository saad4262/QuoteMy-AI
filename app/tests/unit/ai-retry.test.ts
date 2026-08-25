import type OpenAI from 'openai';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { isTransient, OpenAiClient } from '../../src/ai.js';
import { AppError } from '../../src/http.js';

/**
 * A customer mid-conversation should not lose their message because OpenAI had a bad second.
 *
 * There are two retries in this client and they answer different failures. The one inside
 * `callStructured` answers a reply that ARRIVED and did not fit the schema. The one tested here
 * answers a reply that never arrived - a 500, a rate limit, a timeout - and it is the one that
 * was missing: a single 500 surfaced as "the model service is unavailable" and the customer had
 * to send their message again.
 *
 * These drive the real client, with a stand-in for the OpenAI SDK so nothing touches the network.
 */

type Failure = { status?: number; name?: string; error?: { type?: string; code?: string } };

/** Fails its way through `failures`, then answers normally. */
function fakeSdk(failures: Failure[]) {
  const state = { calls: 0 };
  const sdk = {
    responses: {
      create: async () => {
        const failure = failures[state.calls];
        state.calls += 1;
        if (failure) throw Object.assign(new Error('upstream'), failure);
        return { output_text: '{"ok":true}', usage: { input_tokens: 10, output_tokens: 5 } };
      },
    },
  };
  return { sdk: sdk as unknown as OpenAI, state };
}

const call = {
  name: 'turn',
  schema: z.object({ ok: z.boolean() }),
  system: 'system',
  user: 'user',
  maxOutputTokens: 100,
};

function client(failures: Failure[]) {
  const { sdk, state } = fakeSdk(failures);
  const instance = new OpenAiClient('test-key', 'gpt-4o-mini', sdk);
  instance.retryWaitMs = 0; // the backoff is real in production; the test asserts behaviour, not delay
  return { instance, state };
}

describe('a reply that never arrives is retried', () => {
  it('recovers from a single 500 without the customer noticing', async () => {
    const { instance, state } = client([{ status: 500 }]);

    const result = await instance.callStructured(call);

    expect(state.calls).toBe(2);
    expect(result.data).toEqual({ ok: true });
  });

  it('recovers from a rate limit', async () => {
    const { instance, state } = client([{ status: 429 }, { status: 429 }]);
    await instance.callStructured(call);
    expect(state.calls).toBe(3);
  });

  it('recovers from a timeout', async () => {
    const { instance, state } = client([{ name: 'AbortError' }]);
    await instance.callStructured(call);
    expect(state.calls).toBe(2);
  });

  it('gives up after three attempts rather than hanging the turn', async () => {
    const { instance, state } = client([{ status: 500 }, { status: 503 }, { status: 500 }]);

    await expect(instance.callStructured(call)).rejects.toThrow(AppError);
    expect(state.calls).toBe(3);
  });

  it('does not retry an empty credit balance, which 429s like a rate limit but never clears', async () => {
    // The provider answers 429 for both "you are going too fast" and "your balance is empty".
    // Retrying the first is free and usually works; retrying the second spends twelve seconds of
    // a customer's time to fail in exactly the same way, and tells them we are "a bit busy" when
    // what is actually needed is somebody paying a bill.
    const { sdk, state } = fakeSdk([{ status: 429, error: { type: 'insufficient_quota', code: 'credit_balance_exhausted' } }]);
    const instance = new OpenAiClient('test-key', 'gpt-4o-mini', sdk);
    instance.retryWaitMs = 0;

    await expect(instance.callStructured(call)).rejects.toThrow(/out of credit/i);
    expect(state.calls).toBe(1);
  });

  it('does not retry a request that is simply wrong', async () => {
    // A 400 fails identically however many times it is sent - retrying only makes it slower.
    const { instance, state } = client([{ status: 400 }]);

    await expect(instance.callStructured(call)).rejects.toThrow(AppError);
    expect(state.calls).toBe(1);
  });

  it('stops retrying once the call has spent its own time budget', async () => {
    // A provider that HANGS costs the full timeout per attempt, so retrying three times would
    // leave a customer watching a spinner for a minute. A provider that is down answers instantly
    // and is worth retrying. Same error either way - what separates them is the clock.
    const { sdk, state } = fakeSdk([{ name: 'AbortError' }, { name: 'AbortError' }]);
    const instance = new OpenAiClient('test-key', 'gpt-4o-mini', sdk);
    instance.retryWaitMs = 50;

    // The first attempt eats the whole budget, so there is nothing left to retry with.
    await expect(instance.callStructured({ ...call, timeoutMs: 1 })).rejects.toThrow(AppError);
    expect(state.calls).toBe(1);
  });

  it('never leaks the provider\'s own message to the caller', async () => {
    // It can echo prompt content back out, so the customer-facing error is always ours.
    const { instance } = client([{ status: 500 }, { status: 500 }, { status: 500 }]);

    await expect(instance.callStructured(call)).rejects.toThrow(/model service is unavailable/i);
  });
});

describe('isTransient sorts provider problems from our own', () => {
  it.each([
    [{ status: 500 }, true],
    [{ status: 503 }, true],
    [{ status: 429 }, true],
    [{ status: 429, error: { type: 'insufficient_quota' } }, false], // 429, but retrying never helps
    [{ name: 'AbortError' }, true],
    [{ name: 'TimeoutError' }, true],
    [{ status: 400 }, false],
    [{ status: 401 }, false],
    [{ status: 404 }, false],
    [{}, false],
  ])('%o -> %s', (err, expected) => {
    expect(isTransient(err)).toBe(expected);
  });
});
