import { describe, expect, it } from 'vitest';
import { guessTrade } from '../../src/client/guessTrade.js';
import { TRADES, type Trade } from '../../src/vocab.js';
import type { AiClient } from '../../src/ai.js';

/**
 * The last thing tried before asking "which service?".
 *
 * What is tested here is the GUARDS, not the model's judgement - the model is stubbed. Every one of
 * these is a way the router could quietly start putting customers into the wrong trade, and the
 * whole design rests on it being safe to fall through to the question.
 */

const stub = (data: unknown, throws = false): AiClient =>
  ({
    model: 'stub',
    callStructured: async () => {
      if (throws) throw new Error('model is down');
      return { data, tokensIn: 0, tokensOut: 0, costUsd: 0, ms: 0, retries: 0 } as never;
    },
  }) as unknown as AiClient;

const PUB = [...TRADES];
const ask = (message: string, data: unknown, throws = false) =>
  guessTrade(message, PUB, { ai: stub(data, throws) });

describe('reading the trade out of what a customer meant', () => {
  it('takes a confident answer', async () => {
    await expect(ask('we are doing the whole place up', { trade: 'home_renovation', confident: true })).resolves.toBe(
      'home_renovation',
    );
  });

  /**
   * The single most important guard. A router that always picks something would put a customer
   * wanting a plumber, a dam or curtains into a quote for work nobody is going to do - and the
   * picker, which is the right answer for those, would never be reached again.
   */
  it('lets the model say none, and asks instead', async () => {
    await expect(ask('I need a plumber tonight', { trade: 'none', confident: true })).resolves.toBeNull();
  });

  it('discards an answer the model is not sure of', async () => {
    await expect(ask('something about the house', { trade: 'decking', confident: false })).resolves.toBeNull();
  });

  /** A trade this deployment does not serve would route to a screen with nothing behind it. */
  it('refuses a trade that is not published', async () => {
    await expect(
      guessTrade('I need a fence', ['tiling'] as Trade[], { ai: stub({ trade: 'fencing', confident: true }) }),
    ).resolves.toBeNull();
  });

  it('refuses a slug that is not a trade at all', async () => {
    await expect(ask('do the thing', { trade: 'landscaping', confident: true })).resolves.toBeNull();
    await expect(ask('do the thing', { trade: '', confident: true })).resolves.toBeNull();
  });

  /** Never fatal: this is an optimisation on the way to a question that works without it. */
  it('falls through to the question when the model fails', async () => {
    await expect(ask('we are doing the whole place up', null, true)).resolves.toBeNull();
  });

  /** Not worth a call. "hi" and "quote?" have nothing in them to route on. */
  it('does not spend a call on a message too short to mean anything', async () => {
    let called = false;
    const watcher = {
      model: 'stub',
      callStructured: async () => {
        called = true;
        return { data: { trade: 'fencing', confident: true } } as never;
      },
    } as unknown as AiClient;

    await expect(guessTrade('hi', PUB, { ai: watcher })).resolves.toBeNull();
    await expect(guessTrade('quote?', PUB, { ai: watcher })).resolves.toBeNull();
    expect(called).toBe(false);
  });

  it('does not spend a call when no trade is published', async () => {
    let called = false;
    const watcher = {
      model: 'stub',
      callStructured: async () => {
        called = true;
        return { data: { trade: 'fencing', confident: true } } as never;
      },
    } as unknown as AiClient;
    await expect(guessTrade('we are doing the whole place up', [], { ai: watcher })).resolves.toBeNull();
    expect(called).toBe(false);
  });
});
