import type { VerifiedResult } from '../validation/verify.js';
import { label, wordCount } from './labels.js';

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
