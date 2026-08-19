/**
 * Per-1M-token prices, USD. Verified against OpenAI's docs on 2026-08-19 — never fill these in
 * from memory, and re-check before changing a model (CLAUDE.md).
 */
export const MODEL_PRICES: Record<string, { in: number; out: number }> = {
  'gpt-5.6-terra': { in: 2, out: 12 },
  'gpt-5.6-sol': { in: 5, out: 30 },
  'gpt-5.6-luna': { in: 0.2, out: 1.2 },
  'gpt-4o': { in: 2.5, out: 10 },
  mock: { in: 0, out: 0 },
};

export function costUsd(model: string, tokensIn: number, tokensOut: number): number {
  const p = MODEL_PRICES[model];
  if (!p) return 0;
  return Number(((tokensIn * p.in) / 1e6 + (tokensOut * p.out) / 1e6).toFixed(6));
}
