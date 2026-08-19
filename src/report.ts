import type { ReviewResult } from './schemas.js';
import type { VerifiedResult } from './verify.js';

/** Enum slugs are how the database stores it; nobody wants to read timber_pine on a summary screen. */
export const LABELS: Record<string, string> = {
  timber_pine: 'Treated pine',
  timber_hardwood: 'Hardwood / merbau',
  colorbond: 'Colorbond',
  aluminium: 'Aluminium slat',
  pool_aluminium: 'Pool fencing (aluminium)',
  pool_glass: 'Pool fencing (glass)',
  chainmesh: 'Chainmesh / security',
  rural_wire: 'Rural / post and wire',
  pedestrian_single: 'Single pedestrian gate',
  driveway_double: 'Double driveway gate',
  driveway_sliding: 'Sliding driveway gate',
  motor_automation: 'Gate motor / automation',
  sloped: 'Sloped or stepped block',
  rock: 'Rock',
  restricted_access: 'Restricted access',
  hand_dig: 'Hand dig only',
  timber: 'Old timber fence',
  metal: 'Old metal fence',
  any: 'Existing fence',
  per_metre: 'per metre',
  per_item: 'each',
  per_job: 'per job',
  per_sqm: 'per m2',
};

export const label = (key: string): string => LABELS[key] ?? key;

export const wordCount = (text: string): number => text.split(/\s+/).filter(Boolean).length;

/**
 * The model decides WHAT to say; this code decides how it LOOKS and writes the parts that must never
 * vary. Formatting is not a judgement call, and a model asked for markdown drifts - which is why the
 * same submission never comes back looking different the second time.
 *
 * Shape of a rejection:
 *
 *   <opening>                 one line: we read it, here is where it stands
 *   ## Why this matters       one or two lines, in terms of winning work - not the rules restated
 *   ## What we still need     things they never said        -> go and find the numbers
 *   ## What needs to be clearer  things they said vaguely   -> go and rewrite those lines
 *   ## What to do next        written here, in code, so the instruction is identical every time
 *
 * The steps are numbered straight through both sections, so it reads as a list of jobs to do rather
 * than two piles of complaints. Neither section appears if it is empty.
 */
export function buildRejectionReport(r: ReviewResult) {
  const missing = r.fixes.filter((f) => f.kind === 'missing' && f.what);
  const unclear = r.fixes.filter((f) => f.kind === 'unclear' && f.what);

  const md: string[] = [];
  let step = 0;

  const section = (heading: string, items: ReviewResult['fixes']) => {
    if (!items.length) return;
    md.push(heading, '');
    for (const f of items) {
      step += 1;
      md.push(`${step}. ${f.what}`);
      if (f.example) md.push(`   - e.g. \`${f.example}\``);
    }
    md.push('');
  };

  if (r.opening) md.push(r.opening, '');
  if (r.whyUpdatesNeeded) md.push('## Why this matters', '', r.whyUpdatesNeeded, '');

  section('## What we still need', missing);
  section('## What needs to be clearer', unclear);

  md.push(...NEXT_STEP_REJECTED);

  const report = md.join('\n');

  // Exactly two representations and no more: the markdown to render, and the same content
  // structured for a frontend that would rather build its own list. `missing` and `unclear` are
  // fixes.filter(f => f.kind === ...) - a frontend can do that in one line, so we do not ship a
  // third and fourth copy of the same sentences.
  return {
    report,
    fixes: r.fixes,
    nextStep: NEXT_STEP_TEXT_REJECTED,
    counts: { missing: missing.length, unclear: unclear.length },
    reportWordCount: wordCount(report),
  };
}

/**
 * Fixed closings. These are the same words every single time on purpose: they tell the business
 * what the buttons under this report do, and that instruction must not drift with the model's mood.
 */
const NEXT_STEP_TEXT_REJECTED =
  'Update your details and send them through again for approval. If something above does not look right, use the contact button below and one of our team will go through it with you.';

const NEXT_STEP_TEXT_APPROVED =
  'Check the figures above. If they are right, confirm them and your profile goes live for customers. If something is wrong, update your details and send them through again. If you need a hand, use the contact button below.';

const NEXT_STEP_REJECTED = ['## What to do next', '', NEXT_STEP_TEXT_REJECTED];

const NEXT_STEP_APPROVED = ['## What to do next', '', NEXT_STEP_TEXT_APPROVED];

export function buildApprovalReport(d: VerifiedResult, opening: string) {
  const verified = d.status === 'verified';
  const md: string[] = [];

  md.push(
    verified
      ? opening || 'Your pricing is saved. Have a quick look over the figures below before you confirm.'
      : 'Your pricing came through, but we could not match any of the rates back to what you wrote.',
    '',
  );

  const rateLines: string[] = [];
  for (const [material, bands] of Object.entries(d.pricing.rates)) {
    for (const [height, price] of Object.entries(bands)) {
      rateLines.push(`| ${label(material)} | ${height} | $${price} |`);
    }
  }
  if (rateLines.length) {
    md.push('## Your rates', '', '| Type | Height | Per metre |', '| --- | --- | --- |', ...rateLines, '');
  }

  if (d.pricing.removals.length || d.pricing.siteConditions.length) {
    md.push('## Removal and site charges', '', '| | Per metre |', '| --- | --- |');
    for (const r of d.pricing.removals) md.push(`| ${label(r.removes)} removal | $${r.pricePerMetre} |`);
    for (const s of d.pricing.siteConditions) md.push(`| ${label(s.condition)} | + $${s.extraPerMetre} |`);
    md.push('');
  }

  if (d.pricing.gates.length) {
    md.push('## Gates', '', '| Gate | Price |', '| --- | --- |');
    for (const g of d.pricing.gates) {
      const material = g.material ? ` (${label(g.material)})` : '';
      md.push(`| ${label(g.gateType)}${material} | ${g.isFromPrice ? 'from ' : ''}$${g.price} |`);
    }
    md.push('');
  }

  const area = d.pricing.serviceArea;
  md.push('## Your details', '', '| | |', '| --- | --- |');
  md.push(
    `| Area covered | ${
      area.baseLocation ? area.baseLocation + (area.radiusKm ? `, within ${area.radiusKm}km` : '') : 'Not set'
    } |`,
  );
  if (area.excludedAreas.length) md.push(`| Not covered | ${area.excludedAreas.join(', ')} |`);
  md.push(`| Minimum charge | ${d.pricing.minimumCharge !== null ? `$${d.pricing.minimumCharge}` : 'Not set'} |`);
  md.push(
    `| GST | ${
      d.pricing.gstIncluded === true
        ? 'Included in the prices above'
        : d.pricing.gstIncluded === false
          ? 'Not included - added on top'
          : 'Not set'
    } |`,
  );
  for (const e of d.capabilities.extras) {
    const price =
      e.price !== null ? `${e.isFromPrice ? 'from ' : ''}$${e.price}${e.unit ? ` ${label(e.unit)}` : ''}` : 'Price not set';
    md.push(`| ${e.label} | ${price} |`);
  }
  md.push('');

  if (d.unmapped.length) {
    md.push(
      '## What we could not use',
      '',
      'These did not make it into your pricing - either they are not something we hold, or the figure did not match your text.',
      '',
      ...d.unmapped.map((u) => `- ${u}`),
      '',
    );
  }

  md.push(...(verified ? NEXT_STEP_APPROVED : NEXT_STEP_REJECTED));

  const report = md.join('\n');
  return {
    report,
    nextStep: verified ? NEXT_STEP_TEXT_APPROVED : NEXT_STEP_TEXT_REJECTED,
    reportWordCount: wordCount(report),
  };
}
