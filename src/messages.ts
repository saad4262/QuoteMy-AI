import type { Trade } from './vocab.js';

/**
 * Enum slugs are how the database stores it; nobody wants to read timber_pine on a screen.
 *
 * This map is sent with every approved submission so the frontend never keeps its own copy. A
 * second copy would drift from vocab.ts the first time a value is added, and nothing would report
 * the mismatch - the screen would just start showing a raw slug.
 */
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

/**
 * Everything the business reads apart from the fixes themselves is fixed text. It says the same
 * thing every time on purpose: it names what the buttons under it do, and that instruction must not
 * drift with the model's mood.
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
  notAPriceList: {
    opening:
      'This page is for your pricing, and we could not find any in what you sent. Here is what we need before your profile can go live.',
    nextStep:
      'Type it in, or attach your price list as a PDF or a photo - whichever is easier. If you are not sure about any of it, use the contact button below and one of our team will walk you through it.',
  },
  rejected: {
    opening: 'We have been through the details you sent. A few things need updating before your profile can go live.',
    nextStep:
      'Update your details and send them through again for approval. If something above does not look right, use the contact button below and one of our team will go through it with you.',
  },
  failed: {
    opening:
      'Something went wrong on our end reading your details. Nothing you sent has been lost — send it through again, or use the contact button and we will sort it out.',
    nextStep: 'Send your details through again, or use the contact button below and we will sort it out.',
  },
} as const;

/**
 * What to send, when they sent nothing usable. Taken from the blocking rules in
 * prompts/sop/_general.md and prompts/sop/fencing/rules.md - the same rules the review stage
 * judges against, so nobody is asked for one thing and marked against another.
 *
 * Written here rather than by the model: it is the same list every time, and a business staring at
 * an empty form needs the shape of a right answer, not a sentence telling them to try again.
 */
export const WHAT_TO_SEND: Record<Trade, { need: string[]; helpful: string[]; example: string }> = {
  fencing: {
    need: [
      'Each fence type you install, and your price per metre at every height you do it at',
      'Gate prices - single and double separately (or say you do not fit gates)',
      'What you charge per metre to pull down and take away an old fence',
      'Any extra for sloped blocks, rock or tight access - a figure or a percentage (or say you charge none)',
      'How you build: post size and material, spacing, depth, hole diameter, footings, rails per bay, capping',
      'Whether your prices include GST',
      'The suburb or postcode you work out from, and how far you travel',
      'The smallest job you will take on, and what you charge for it',
      'Who arranges and pays for council permits, and any fee',
      'How long your workmanship is warranted for',
    ],
    helpful: [
      'Anything not included in your prices - painting, stump removal, engineering drawings',
      'Pool fencing: your AS 1926.1 position and whether a compliance certificate is included',
      'Areas inside your radius that you do not travel to',
    ],
    example: [
      'TREATED PINE',
      '1.8m high - $85 per metre',
      '2.1m high - $104 per metre',
      '',
      'COLORBOND',
      '1.8m high - $110 per metre',
      '',
      'Gates: single pedestrian $480, double driveway $1,340.',
      'Removal of an old timber fence: $18 per metre.',
      'Sloped blocks +10%. Rock or hand-dig +$22/m. Restricted access +$9/m.',
      '',
      'HOW WE BUILD',
      'Posts 100x100mm H4 treated pine at 2.4m centres, 700mm deep in concrete,',
      'hole diameter 300mm. Three rails of 75x50mm per bay. Capping 150x25mm.',
      '',
      'All prices include GST. Based in Berwick, we travel 30km. Minimum charge $850.',
      'Council permits are the customer\'s responsibility. Workmanship warranted 7 years.',
    ].join('\n'),
  },
};
