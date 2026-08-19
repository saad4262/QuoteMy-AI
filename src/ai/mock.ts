import type { Material } from '../shared/vocab.js';
import type { AiClient, ModelCall, ModelResult } from './types.js';

/**
 * A deterministic stand-in for the model, used when `AI_PROVIDER=mock`.
 *
 * It exists so the whole request/response cycle — routes, validation, verification, reports,
 * storage, status transitions — can be exercised in Postman and in tests without an API key and
 * without spending anything. It is a rule-based reader, not an intelligence: it recognises firm
 * `$N per metre` lines and little else, which is exactly enough to prove the plumbing.
 *
 * It is never a fallback for a real failure. Switching provider is an explicit env change, and
 * every response says `"model": "mock"` in `meta`.
 */

const MATERIAL_HINTS: [RegExp, Material][] = [
  [/merbau|hardwood|spotted gum|jarrah/i, 'timber_hardwood'],
  [/treated pine|pine paling|paling/i, 'timber_pine'],
  [/colorbond|steel/i, 'colorbond'],
  [/glass/i, 'pool_glass'],
  [/pool/i, 'pool_aluminium'],
  [/aluminium|slat/i, 'aluminium'],
  [/chainmesh|chain wire|chain link/i, 'chainmesh'],
  [/rural|post and wire|paddock/i, 'rural_wire'],
];

const RATE_LINE = /^(.*?)([0-9]+(?:\.[0-9]+)?)\s*m\b.*?\$\s*([0-9]+(?:\.[0-9]+)?)\s*(?:per\s*(?:linear\s*)?met|\/\s*m)/i;

interface MockRate {
  material: Material;
  heightM: number;
  pricePerMetre: number;
  sourceQuote: string;
}

function readRates(text: string): MockRate[] {
  const lines = text.split('\n');
  const out: MockRate[] = [];
  let heading: Material | null = null;

  for (const line of lines) {
    const headingMatch = MATERIAL_HINTS.find(([re]) => re.test(line));
    if (headingMatch && !/\$/.test(line)) heading = headingMatch[1];

    const m = RATE_LINE.exec(line.trim());
    if (!m) continue;

    const inline = MATERIAL_HINTS.find(([re]) => re.test(m[1] ?? ''));
    const material = inline ? inline[1] : heading;
    if (!material) continue;
    if (/from\s*\$|poa|call us|–|—\s*\$?\d+\s*-\s*\$/i.test(m[1] ?? '')) continue;

    out.push({
      material,
      heightM: Number(m[2]),
      pricePerMetre: Number(m[3]),
      sourceQuote: line.trim(),
    });
  }
  return out;
}

const sentenceWith = (text: string, re: RegExp): string | null =>
  text.split('\n').find((l) => re.test(l))?.trim() ?? null;

export class MockAiClient implements AiClient {
  readonly model = 'mock';

  async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
    const text = call.user;
    const rates = readRates(text);
    const data = call.name === 'review' ? this.review(text, rates) : this.extraction(text, rates);

    const usage = {
      name: call.name,
      ms: 1,
      tokensIn: Math.ceil((call.system.length + text.length) / 3.6),
      tokensOut: 0,
      retries: 0,
      costUsd: 0,
    };
    return { data: call.schema.parse(data), usage };
  }

  private review(text: string, rates: MockRate[]) {
    const hasGst = /gst/i.test(text);
    const hasMinimum = /minimum charge/i.test(text);
    const vague = /\bpoa\b|call (?:us|for pricing)|from \$\d/i.test(text);

    const fixes: { what: string; example: string | null }[] = [];
    if (rates.length < 3) {
      fixes.push({
        what: 'Give a firm price per metre for each fence type and height you do — most of what you sent is written as a range or a "call us".',
        example: 'Colorbond 1.8m - $110/m (your figure)',
      });
    }
    if (!hasGst) fixes.push({ what: 'Say whether your prices include GST.', example: null });
    if (!hasMinimum) fixes.push({ what: 'Add the smallest job you will take on and what you charge for it.', example: null });
    if (vague && rates.length >= 3) {
      fixes.push({ what: 'Replace the remaining "POA" and "from" figures on your core rates with the price you actually charge.', example: null });
    }

    const approved = fixes.length === 0;
    return {
      approved,
      opening: approved
        ? 'Thanks for sending your pricing through — it has everything we need, so it is going live for you to check.'
        : 'Thanks for sending your pricing through — there is good detail here, but we need a few firm numbers before it can go live.',
      whyUpdatesNeeded: approved
        ? ''
        : 'Customers get an instant quote straight from your rates, so anything left as a range or "POA" means your business will not come up in their results.',
      fixes: approved ? [] : fixes.slice(0, 5),
      closing: approved
        ? 'Have a quick look over the figures on your dashboard and confirm them to go live.'
        : 'Add those in and send it through again — should only take a few minutes.',
    };
  }

  private extraction(text: string, rates: MockRate[]) {
    const gstLine = sentenceWith(text, /gst/i);
    const minLine = sentenceWith(text, /minimum charge/i);
    const minMatch = minLine ? /\$\s*([0-9,]+)/.exec(minLine) : null;
    const radiusLine = sentenceWith(text, /\b\d+\s*km\b/i);
    const radiusMatch = radiusLine ? /(\d+)\s*km/i.exec(radiusLine) : null;

    return {
      businessName: text.split('\n')[0]?.split('\u2014')[0]?.trim() ?? null,
      gstIncluded: gstLine ? /include/i.test(gstLine) : null,
      gstSourceQuote: gstLine,
      serviceArea: {
        baseLocation: /based in ([A-Z][a-zA-Z ]+)/.exec(text)?.[1]?.trim() ?? null,
        radiusKm: radiusMatch?.[1] ? Number(radiusMatch[1]) : null,
        radiusSourceQuote: radiusLine,
        excludedAreas: [],
      },
      minimumCharge: minMatch?.[1] ? Number(minMatch[1].replace(/,/g, '')) : null,
      minimumChargeSourceQuote: minLine,
      rates,
      removals: [],
      gates: [],
      siteConditions: [],
      extras: [],
      inclusions: [],
      exclusions: [],
      tags: [],
      unmapped: ['Read by the offline mock reader — gates, removals and surcharges are not extracted in mock mode.'],
    };
  }
}
