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
      '## Worth a look',
      '',
      'We could not save these as pricing - either they are not something we hold, or the figure did not match your text.',
      '',
      ...d.unmapped.map((u) => `- ${u}`),
      '',
    );
  }

  md.push(
    verified
      ? 'If a figure looks wrong, update your description and send it again. Confirm on your dashboard to go live.'
      : 'Write your rates out with the number and the unit together, then send it through again.',
  );

  const report = md.join('\n');
  return { report, reportWordCount: wordCount(report) };
}
