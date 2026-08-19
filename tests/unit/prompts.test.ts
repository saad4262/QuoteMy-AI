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
