import { describe, expect, it } from 'vitest';
import { assertPromptBudgets, estimateTokens, reviewPrompt, transcribePrompt, wrapDescription, PROMPT_TOKEN_BUDGET } from '../../src/prompts.js';

describe('prompt assembly', () => {
  it('appends both SOPs to the review prompt, so there is nothing for the model to skip', () => {
    const prompt = reviewPrompt('fencing');
    expect(prompt).toContain('GENERAL PUBLISH RULES');
    expect(prompt).toContain('FENCING RULES');
    expect(prompt).not.toContain('knowledge lookup tools');
  });

  it('carries the scope guard that keeps it off unrelated subjects', () => {
    expect(reviewPrompt('fencing')).toContain('SCOPE - WHAT YOU WILL AND WILL NOT ANSWER');
  });

  it('stays inside its token budget', () => {
    expect(estimateTokens(reviewPrompt('fencing'))).toBeLessThan(PROMPT_TOKEN_BUDGET.review);
    expect(() => assertPromptBudgets()).not.toThrow();
  });

  it('fences untrusted text', () => {
    const wrapped = wrapDescription('fencing', 'Timber 1.8m $85/m');
    expect(wrapped).toContain('<<<DESCRIPTION>>>');
    expect(wrapped).toContain('<<<END DESCRIPTION>>>');
  });
});

describe('previous review block', () => {
  const fixes = ['Say whether your prices include GST.', 'Add the smallest job you will take on.'];

  it('is absent on a first submission', () => {
    expect(reviewPrompt('fencing')).not.toContain('WHAT WE ASKED FOR LAST TIME');
    expect(reviewPrompt('fencing', [])).not.toContain('WHAT WE ASKED FOR LAST TIME');
  });

  it('carries what we asked for last time, and the rules that stop it being parroted back', () => {
    const prompt = reviewPrompt('fencing', fixes);

    expect(prompt).toContain('WHAT WE ASKED FOR LAST TIME');
    for (const fix of fixes) expect(prompt).toContain(fix);

    // the three guards that make this context rather than a conclusion
    expect(prompt).toMatch(/judge the submission in front of you from\s*\n?scratch/i);
    expect(prompt).toMatch(/do NOT assume any of it was addressed/i);
    expect(prompt).toMatch(/breaks something new/i);
  });

  it('still fits the token budget with the block attached', () => {
    expect(estimateTokens(reviewPrompt('fencing', fixes))).toBeLessThan(PROMPT_TOKEN_BUDGET.review);
  });
});

/**
 * The section that lets a photograph of a room be described rather than come back empty.
 *
 * Kept in its own file and appended, never substituted: the copying rules above it are what the
 * BUSINESS pipeline runs on, and that side's honesty guarantee is that every figure carries the
 * sentence it came from and `verify/` string-matches it against the transcript. A described
 * sentence in that transcript would be a source quote the model wrote for itself.
 */
describe('the transcribe prompt', () => {
  it('says nothing about describing anything unless asked', () => {
    expect(transcribePrompt()).not.toContain('NOTHING WRITTEN TO COPY');
    expect(transcribePrompt(false)).toBe(transcribePrompt());
  });

  it('adds the describing rules without touching the copying ones', () => {
    const described = transcribePrompt(true);
    expect(described).toContain('NOTHING WRITTEN TO COPY');
    expect(described.startsWith(transcribePrompt())).toBe(true);
  });

  it('forbids a number in a description, which is the whole of the safety here', () => {
    /* Anything written here is read back later as though the customer had written it, so a figure
       estimated off a photo would be taken for one they measured - and quoted on. */
    const described = transcribePrompt(true);
    expect(described).toContain('NEVER A NUMBER');
    expect(described).toMatch(/not a measurement/i);
    expect(described).toMatch(/never name a material you cannot be sure of/i);
    expect(described).toMatch(/never judge the job/i);
  });

  it('fits the token budget in both shapes', () => {
    expect(estimateTokens(transcribePrompt(true))).toBeLessThan(PROMPT_TOKEN_BUDGET.transcribe);
    expect(() => assertPromptBudgets()).not.toThrow();
  });
});
