import { beforeEach, describe, expect, it } from 'vitest';
import { clearSchemaCache } from '../../src/client/schema.js';
import { MemoryRepository, setRepository } from '../../src/store.js';
import { CONVERSATIONS, runScript } from './conversations.js';

/**
 * The safety net for the dynamic-schema migration (`docs/DYNAMIC-SCHEMA-PLAN.md`).
 *
 * Every step of that plan moves a hardcoded constant somewhere else without changing what the chat
 * does. "Without changing what the chat does" is only a claim until something checks it, so these
 * snapshots hold the entire response of every turn of twelve conversations. A step that moves one
 * of them has either broken a guard or made a deliberate change that belongs in its commit message.
 *
 * The snapshots are meant to be read in review, not just diffed by the runner - hence one file per
 * conversation, named for what it covers.
 */

const slugOf = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

describe('golden conversations', () => {
  let repo: MemoryRepository;

  beforeEach(() => {
    repo = new MemoryRepository();
    setRepository(repo);
    clearSchemaCache(); // process-cached, so one conversation must never inherit another's
  });

  for (const conversation of CONVERSATIONS) {
    it(conversation.name, async () => {
      const transcript = await runScript(conversation, repo);
      await expect(transcript).toMatchFileSnapshot(`./__snapshots__/${slugOf(conversation.name)}.md`);
    });
  }
});
