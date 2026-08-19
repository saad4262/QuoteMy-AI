import type { ReviewResult } from '../schemas/review.js';
import { wordCount } from './labels.js';

/**
 * The agent decides what to say and what to group; code decides layout. Formatting is not a
 * judgement call, and a model asked for markdown drifts — this is the main reason the report never
 * comes out differently the second time.
 */
export function buildRejectionReport(r: ReviewResult) {
  const md: string[] = [];

  if (r.opening) md.push(r.opening, '');

  if (r.whyUpdatesNeeded) md.push('## Why these updates are needed', '', r.whyUpdatesNeeded, '');

  if (r.fixes.length) {
    md.push('## What needs fixing', '');
    for (const f of r.fixes) {
      if (!f.what) continue;
      md.push(`- ${f.what}`);
      if (f.example) md.push(`  - e.g. \`${f.example}\``);
    }
    md.push('');
  }

  if (r.closing) md.push(r.closing);

  const report = md.join('\n');

  return {
    report,
    opening: r.opening,
    fixes: r.fixes,
    // Kept for the frontend only — a compact list or a count badge. Deliberately not rendered into
    // the report itself: a tradesperson does not need to be told how many things are wrong.
    fixList: r.fixes.map((f) => f.what).filter(Boolean),
    reportWordCount: wordCount(report),
  };
}
