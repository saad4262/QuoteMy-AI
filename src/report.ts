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
 * Everything the business reads apart from the fixes themselves is fixed text. It says the same
 * thing every time on purpose: it tells them what the buttons under it do, and that instruction
 * must not drift.
 */
export const MESSAGES = {
  approved: {
    opening: 'Your details have been approved. Below is what we have saved from them.',
    nextStep:
      'Check the figures. If they are right, confirm them and your profile goes live for customers. If something is wrong, update your details and send them through again, or use the contact button below if you need a hand.',
  },
  nothingUsable: {
    opening: 'Your details came through, but we could not match any of your rates back to what you wrote.',
    nextStep:
      'Write your rates out with the number and the unit together - for example "Colorbond 1.8m - $110 per metre" - and send them through again. If you would rather talk it through, use the contact button below.',
  },
  rejected: {
    opening: 'We have been through the details you sent. A few things need updating before your profile can go live.',
    nextStep:
      'Update your details and send them through again for approval. If something above does not look right, use the contact button below and one of our team will go through it with you.',
  },
} as const;

/**
 * The report is the ADMIN artifact - one readable page showing what was decided and what was read.
 * The business never sees it: they get the fixed opening, their own fields, and the next step, all
 * as structured data their own UI renders. Nobody should have to read a 20-line table to find out
 * that their submission passed.
 */
export function buildRejectionReport(fixes: ReviewResult['fixes']) {
  const missing = fixes.filter((f) => f.kind === 'missing' && f.what);
  const unclear = fixes.filter((f) => f.kind === 'unclear' && f.what);

  const md: string[] = [MESSAGES.rejected.opening, ''];
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

  section('## What we still need', missing);
  section('## What needs to be clearer', unclear);

  md.push('## What to do next', '', MESSAGES.rejected.nextStep);

  const report = md.join('\n');
  return {
    report,
    counts: { missing: missing.length, unclear: unclear.length },
    reportWordCount: wordCount(report),
  };
}

export function buildApprovalReport(d: VerifiedResult) {
  const verified = d.status === 'verified';
  const md: string[] = [];

  md.push(verified ? MESSAGES.approved.opening : MESSAGES.nothingUsable.opening, '');

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

  md.push('## What to do next', '', verified ? MESSAGES.approved.nextStep : MESSAGES.nothingUsable.nextStep);

  const report = md.join('\n');
  return { report, reportWordCount: wordCount(report) };
}
