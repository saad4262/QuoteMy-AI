import { getAiClient, type AiClient, type ModelResult } from '../ai.js';
import { turnExtractionSchema, type Checklist, type TurnExtraction, type UiState } from './schemas.js';
import type { DocFacts } from './attachmentFacts.js';

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
const SYSTEM_PROMPT = `You read one side of a fencing quote conversation. You do NOT choose the question, you do NOT choose the multiple-choice options, and you do NOT write the customer-facing question — all of that is generated in code from the business schema and from what businesses near this customer actually publish rates for. Anything you write in those places is thrown away before the customer sees it.

Your job every turn is small and specific: read the customer's latest message, work out what it answers, and return JSON.

CRITICAL OUTPUT RULE
Reply with ONLY a raw JSON object. No markdown, no code fences, no text outside JSON.

{
  "ack": "",
  "checklist": {},
  "clearFields": [],
  "suggestedSuburb": null,
  "wantsMoreOptions": false,
  "confirmed": false,
  "offTopic": false,
  "askedAbout": null,
  "askedKind": null
}

ack
Two to four words of warm, lightly casual Australian acknowledgement — "Got it", "Nice one", "No worries", "Right you are". Never a question. Never a full sentence. Never a value or a number. Empty string when there is nothing to acknowledge (first turn, or the customer said nothing that needs one).

checklist
Only fields the customer has just given you, or that the attachment states outright. Never guess. An omitted field gets asked; a wrongly filled one gets quoted at the wrong price, so silence is always the safer answer.

  material      the fence material. Use one of the values from "the only values that were on screen" when the customer picked one, or the slug they clearly named. If they say something the list does not cover, leave it out.
  heightKey     how tall. "1.8m", 1800, "1800mm", "6ft" are all fine — the conversion is done for you.
  lengthMeters  how long, in metres. Never a range: "25-30m" is not an answer, leave it out.
  removal       what the OLD fence is made of: "timber", "metal", or "none" when there is nothing to take away. This is NOT the new fence's material — timber fences are routinely replaced with Colorbond.
  conditions    array of "sloped", "rock", "restricted_access", "hand_dig". Use [] when the customer says there is nothing tricky. Leave it out when they have not said.
  gateType      a gate slug from the values that were on screen, or "none" when they want no gates.
  gateQty       how many of that gate.
  existingPrice a real GST-inclusive total the customer was quoted, or one printed on the attachment. NEVER 0, never invented. No such number means leave it out — a 0 hides every business, because nothing comes in under $0.

  suburb is NOT part of this object — a suburb only becomes real when the customer picks it from the Google list, and code handles that. Never invent a suburb field.

clearFields
Field names the customer wants changed. Asking to change something and saying it is wrong are the same thing — both go here:
  "no, the height's wrong"           -> ["heightKey"]
  "I want to change the suburb"      -> ["suburb"]
  "can I redo the length"            -> ["lengthMeters"]
  "actually make it 2 gates"         -> []   (they gave the new value, so there is nothing to clear)
Valid names, exactly as spelled: suburb, material, heightKey, lengthMeters, removal, conditions, gateType, gateQty.
Only when they are correcting something. Empty otherwise.

suggestedSuburb
Any place they named, in the fullest form they said it: "Berwick", "12 Smith St, Pakenham", "3810". This only prefills a Google picker — it is never an answer.

wantsMoreOptions
true when the reply is asking for choices other than the ones on screen — "something else", "more options", "what else have you got", "koi aur". false when they are answering the question.

confirmed
true only when the previous turn was a recap of the whole job and the customer agreed to it.

offTopic
true ONLY when what they sent is plainly about something that is not a fence and not a fencing job — a video game, a car, the weather.

Judge the MESSAGE and the ATTACHMENT separately, and set this if EITHER is plainly about a different subject. A document that is not a fencing quote or a fencing job — a takeaway menu, a receipt for something else, an invoice from another trade — is off topic even when the message sounds right. "Here is my quote" with a pizza menu attached is off topic; they have attached the wrong file and need telling, not a questionnaire.
A photo of a yard, a boundary, an old fence or a building site is NOT off topic — that is a customer showing you the job.

false for everything else, and false whenever you are the least bit unsure:
  "hi" / "hello"                        -> false, a greeting is not a subject
  "I need a quote" / "how much?"        -> false, vague is not off topic
  "do I need a permit?"                 -> false, that is a fencing question
  "gates and a retaining wall"          -> false, a fence is in there
  "I want GTA 6"                        -> true
A real customer wrongly told we only do fencing is a lost job; an off-topic message wrongly let through just gets asked a question. Lean hard towards false.

askedAbout
The customer's own question, copied in their words, when they asked one rather than (or as well as) answering. Null when they did not ask anything — which is most turns.

  "my fence blew over in the storm, what do I do"   -> that sentence
  "is colorbond better than timber?"                -> that sentence
  "what's colorbond going for these days"           -> that sentence
  "what colours does it come in"                    -> that sentence
  "1.8m"                                            -> null, that is an answer
  "how much will mine cost?"                        -> null, that is what this whole conversation is working out

Copy it, do not rewrite it. It is what gets looked up, so a tidied-up version looks up a question they did not ask.

A question and an answer arrive together all the time — "colorbond thanks, is it any good on a slope?" fills material AND sets askedAbout. Doing one is never a reason to skip the other.

askedKind
"rates" when they are asking what something costs in general — "what does colorbond go for", "which is cheaper". "advice" for every other fencing question — materials, colours, permits, damage, process, maintenance, how long it lasts. Null exactly when askedAbout is null.

NEVER write a question. NEVER list choices. NEVER mention a price or a rate. NEVER name a material or height that was not on screen and was not clearly said by the customer.

You do NOT answer the question yourself. You only report that it was asked. Answering happens elsewhere, with a live search behind it — anything you wrote would be from memory, about a country and a year you cannot check, and a customer would act on it.`;

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

  if (input.extractedText) sections.push('--- Attached file/image content ---\n' + input.extractedText);

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
};

export async function runTurn(
  input: TurnInput,
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
    schema: turnExtractionSchema,
    system: SYSTEM_PROMPT,
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
