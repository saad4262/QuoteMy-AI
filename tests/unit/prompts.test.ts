import { describe, expect, it } from 'vitest';
import { assertPromptBudgets, estimateTokens, reviewPrompt, wrapDescription, PROMPT_TOKEN_BUDGET } from '../../src/prompts.js';

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
