import { getAiClient, type AiClient, type ModelResult } from '../ai.js';
import { chatPrompt } from '../prompts.js';
import type { Trade } from '../vocab.js';
import { turnSchemaFor, type Checklist, type TurnExtraction, type UiState } from './schemas.js';
import { TRADE_FIELDS } from './fieldSpec.js';
import type { DocFacts } from './attachmentFacts.js';
import { onlyDescriptions, withoutDescriptions } from '../ingest.js';

/**
 * Cheap and small on purpose: this call does one narrow thing (read a sentence, report which
 * field it answers), never the reasoning-heavy work the business side's extraction does. Approved
 * alongside the business side's `gpt-5.6-sol` - see CLAUDE.md.
 */
const MODEL = 'gpt-4o-mini';

/**
 * Ported from n8n's `Fencing AI Agent` system message.
 *
 * n8n answered general questions - permits, materials, process - from a `fencing_knowledge_lookup`
 * tool holding a pasted block of Victorian fencing knowledge. The port dropped it, and for a while
 * this prompt told the model outright that it had no way to answer such a question: the turn then
 * fell through to the next checklist question and the customer was re-asked it with no sign that
 * they had asked anything. It did not read as a refusal, it read as not listening.
 *
 * `askedAbout` is that hole filled, from a live search rather than a pasted block - half of what
 * customers ask ("what is Colorbond going for") has an answer that goes stale. This call only
 * REPORTS the question; `askAbout.ts` answers it. Keeping those apart is what stops a cheap model
 * with no search behind it from inventing a price from memory.
 */
/* The agent's briefing moved to src/prompts/chat/{trade}.md - it is data, and a trade writes
   its own from its own field spec. `chatPrompt(trade)` serves it. */

export interface TurnInput {
  message: string;
  extractedText: string;
  docFacts: DocFacts;
  docSuburbHint: string | null;
  /** Whatever the client already has, minus `_ui`. */
  known: Partial<Omit<Checklist, '_ui'>>;
  ui: UiState | null;
}

/**
 * The briefing handed to the model: what it needs to do its one job, and nothing it could use to
 * override state it was not asked about. Ported from `Read Attachment Facts`'s `agentContext`
 * builder - what was last asked, and what was on screen when it was asked, is what gives the
 * model a strong prior that the reply answers THAT field rather than something else.
 */
export function buildAgentContext(input: TurnInput): string {
  const sections: string[] = [];

  /* Copied text and described photos are handed over in two separate blocks, under two headings
     that say which is which. Together they read as one thing, and "the attachment states outright"
     - which is what the briefing lets the model fill a field from - would then cover a sentence the
     model wrote about a photograph. `withoutDescriptions` is the same split `mentioned()` uses to
     decide what counts as evidence, so the model is shown the same line the code draws. */
  const copied = withoutDescriptions(input.extractedText);
  if (copied) sections.push('--- Attached file/image content ---\n' + copied);

  const described = onlyDescriptions(input.extractedText);
  if (described) {
    sections.push(
      '--- What the attached PHOTOS appear to show. NOT the customer`s words, and never an answer ---\n' +
        described,
    );
  }

  if (Object.keys(input.docFacts).length) {
    sections.push('--- Read off the attachment already, treat as settled ---\n' + JSON.stringify(input.docFacts));
  }

  if (input.docSuburbHint) {
    sections.push(
      '--- Job address on the document (suggestedSuburb ONLY, never checklist.suburb) ---\n' + input.docSuburbHint,
    );
  }

  const establishedKeys = (Object.keys(input.known) as (keyof typeof input.known)[]).filter(
    (key) => input.known[key] !== null && input.known[key] !== undefined,
  );
  if (establishedKeys.length) {
    const established: Record<string, unknown> = {};
    for (const key of establishedKeys) established[key as string] = input.known[key];
    sections.push('--- Already established for this job ---\n' + JSON.stringify(established));
  }

  /* What has already been said, before what was last asked - so the model reads the conversation in
     the order it happened and arrives at this turn last.

     This is the difference between a system that is listening and one that is only filling in a
     form. Without it, "let's go with the one you recommended" points at nothing, "as I said, I'm in
     Pakenham" reads as new information, and a question the customer has already answered in passing
     gets put to them again. The checklist carries the answers; this carries everything else they
     said. */
  if (input.ui?.history?.length) {
    sections.push(
      '--- Earlier in this conversation, oldest first. Their words and yours ---\n' +
        input.ui.history.map((note) => 'they said: ' + note.you + '\nyou replied: ' + note.me).join('\n\n'),
    );
  }

  if (input.ui?.lastAsked) {
    sections.push(
      '--- The question you asked last turn ---\n' +
        'field: ' +
        input.ui.lastAsked +
        '\n' +
        'question: ' +
        (input.ui.lastQuestion || '') +
        '\n' +
        'the only values that were on screen: ' +
        JSON.stringify(input.ui.lastValues || []) +
        '\n' +
        'The customer is almost certainly answering THIS field.',
    );
  }

  return [input.message].concat(sections).join('\n\n');
}

/** A turn where the model was not consulted. Nothing changes; nothing is claimed. */
export const SAID_NOTHING: TurnExtraction = {
  ack: '',
  checklist: {
    material: null, heightKey: null, lengthMeters: null, removal: null,
    conditions: null, gateType: null, gateQty: null, existingPrice: null,
  },
  clearFields: [],
  suggestedSuburb: null,
  wantsMoreOptions: false,
  confirmed: false,
  offTopic: false,
  askedAbout: null,
  askedKind: null,
  pictureOf: null,
  mentionedOldFence: false,
  namedOffList: null,
};

export async function runTurn(
  input: TurnInput,
  trade: Trade,
  deps: { ai?: AiClient } = {},
): Promise<ModelResult<TurnExtraction>> {
  /* The model reads exactly two things: what the customer typed, and what came off an attachment.
     With neither there is nothing to read, whatever else the briefing carries - the rest of it is
     state we already hold. Two reasons to stop here rather than call anyway: on the first turn the
     briefing is empty too, and the provider rejects an empty `input` outright, so pressing send on
     an empty box came back as "the model service is unavailable"; and on every later turn it is a
     call that cannot tell us anything. */
  if (!input.message.trim() && !input.extractedText.trim()) {
    return {
      data: SAID_NOTHING,
      usage: { name: 'turn', ms: 0, tokensIn: 0, tokensOut: 0, retries: 0, costUsd: 0 },
    };
  }

  const ai = deps.ai ?? getAiClient();
  return ai.callStructured({
    name: 'turn',
    /* Both per trade, and they have to agree: the briefing describes the fields, the schema is the
       fields. Built from one list (`TRADE_FIELDS`) so they cannot drift apart. */
    schema: turnSchemaFor(TRADE_FIELDS[trade]),
    system: chatPrompt(trade),
    user: buildAgentContext(input),
    model: MODEL,
    maxOutputTokens: 700,
    /* A ceiling on the whole turn, retries included - somebody is sitting watching a spinner.
       When the provider is throttling, each rejection still takes it several seconds to send, so
       three attempts at the 20s this used to allow meant a customer waited nineteen seconds to be
       told we were busy. Failing at twelve is not good news either, but it is news sooner. */
    timeoutMs: 12_000,
  });
}
