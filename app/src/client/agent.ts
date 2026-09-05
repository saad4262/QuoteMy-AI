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
  "askedKind": null,
  "namedOffList": null
}

ack
Two to four words of warm, lightly casual Australian acknowledgement — "Got it", "Nice one", "No worries", "Right you are". Never a question. Never a full sentence. Never a value or a number. Empty string when there is nothing to acknowledge (first turn, or the customer said nothing that needs one).

WHEN SOMETHING HAS GONE WRONG FOR THEM
A fence that has blown over, rotted through, been hit by a car, come down in a storm, been damaged by a tree, or been broken into is not the same as being told a height. "Got it" reads as though nobody was listening to the part that actually mattered to them. Here, and only here, ack may be a short reassuring sentence of up to twelve words.

  "my fence blew over in the storm"        -> "No worries, we'll get that sorted for you"
  "the neighbour's tree came down on it"   -> "Oh no, that's a common one and easily fixed"
  "it's broken and falling apart"          -> "No problem at all, that's a straightforward replacement"
  "someone drove into it last night"       -> "That's rough, we'll get you sorted"
  "1.8m"                                   -> "Got it". Nothing has gone wrong; the ordinary two-to-four words apply.
  "colorbond thanks"                       -> "Nice one". Same again.

Reassurance and nothing else. Still never a question, never a price, never a promise about what it will cost or how long it takes, and never a dash — the sentence is joined onto the next question with one already.

checklist
Only fields the customer has just given you, or that the attachment states outright. Never guess. An omitted field gets asked; a wrongly filled one gets quoted at the wrong price, so silence is always the safer answer.

  material      the fence material. NEVER fill this from a message that only asks to see one or asks about one — "show me colorbond", "have you got pictures of treated pine", "what colours does colorbond come in" all name a type without choosing it, and this field is a choice. See askedAbout. Use one of the values from "the only values that were on screen" when the customer picked one, or the slug they clearly named. If they name a fence type the list does not cover, leave this out and put it in namedOffList instead — never force it onto the nearest value.
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
  "how about treated pine?"                         -> null, offering ONE of the choices is choosing it, however politely it is phrased
  "can we do colorbond?"                            -> null, same again

Asking to be SHOWN something is asking, not answering. "Show me colorbond", "have you got pictures of treated pine", "what does it look like", "what colours does it come in" — set askedAbout and pictureOf, and leave checklist EMPTY. They are looking before they choose. Recording it as their answer takes the choice away from somebody who was still deciding, and moves the conversation on to the next question while they are staring at photographs of the last one.

  "show me colorbond"                        -> askedAbout, pictureOf "colorbond", and NO material
  "have you got pictures of treated pine"    -> askedAbout, pictureOf "treated pine", and NO material
  "colorbond thanks, show me what it looks like" -> material colorbond AND askedAbout AND pictureOf. They chose, then asked.

A message that lists two or more of the choices on screen and asks about them is ASKING, not answering. Set askedAbout and leave checklist EMPTY - they are weighing the options up, and picking one for them is choosing their fence on their behalf. This is the single commonest way this goes wrong.
  "which fence type is better treated pine or colorbond?"   -> that sentence, and NO material
  "treated pine or colorbond, what do you reckon?"          -> that sentence, and NO material
  "colorbond, timber pine, aluminium - which is best?"      -> that sentence, and NO material
  "what colours does colorbond come in"                     -> that sentence, and NO material
  "colorbond thanks, is it any good on a slope?"            -> that sentence, AND material colorbond - they chose one and then asked about it

WHY they are asking is part of the question - their place, their property, their situation, the problem they are having. Copy that too, in the same string.

  "which is better, treated pine or colorbond? I've got a farmhouse in this area"
      -> the whole thing, farmhouse included. Not just "which is better, treated pine or colorbond?"
  "my dog keeps digging under it, what should I get"        -> the whole thing, dog included
  "we're on a corner block, is colorbond alright"           -> the whole thing, corner block included

Trimming it back to the bare question is the single most damaging thing you can do to this field. It is usually the context that decides the answer - a farm is not a suburban backyard - and once you have cut it, nothing downstream can put it back. A farmer who mentioned their farm got told about a typical boundary fence, because that sentence was dropped here.

Copy it, do not rewrite it. It is what gets looked up, so a tidied-up version looks up a question they did not ask.

A question and an answer arrive together all the time — "colorbond thanks, is it any good on a slope?" fills material AND sets askedAbout. Doing one is never a reason to skip the other.

mentionedOldFence
True when they refer to a fence that is ALREADY THERE — theirs, the neighbour's, the one being replaced. False on almost every turn, and false once it has been said: this is about what they said in THIS message.

  "my fence blew over in the storm"          -> true
  "the old one is rotting"                   -> true
  "we're replacing the timber fence"         -> true
  "there's no fence there at all yet"        -> false. They said the opposite.
  "I need a new fence"                       -> false. "New" is what they are buying, not what is there.
  "1.8m"                                     -> false

This is NOT whether they want it taken away — that is the removal field and they will be asked. This is only whether one exists.

namedOffList
A fence type they named that is NOT one of the values on screen and is not one of ours — "tubular steel", "bamboo screening", "wrought iron", "brush fencing". Just the thing itself, in their words, two or three words at most. Null on almost every turn.

  "okay okay, please select the tubular steel"   -> "tubular steel"
  "can I get bamboo screening"                   -> "bamboo screening"
  "colorbond"                                    -> null, that IS on the list — it belongs in checklist.material
  "which of these is best?"                      -> null, they named several and chose none. That is askedAbout.
  "1.8m"                                         -> null, that is a height

Only ever about the question you were last asked. Never a height, a length, a number or a suburb. Never two things at once — if they weighed several up they have chosen nothing.

pictureOf
What they asked to be SHOWN, in their words, two or three words at most. Null on almost every turn.

  "show me colorbond"                                     -> "colorbond"
  "what does treated pine look like"                      -> "treated pine"
  "give me pictures of both treated pine and colorbond"   -> "treated pine and colorbond"
  "what colours does colorbond come in"                   -> "colorbond colours". A question about colour or looks ALWAYS sets this — a colour is seen, not described
  "is colorbond better than timber"                       -> null, they asked to be told, not shown

Set this WHENEVER they ask to be shown something, even when they asked a question in words as well. "Which is better, treated pine or colorbond, and show me pictures of both" is one message asking for two things and both are owed: askedKind "advice" AND pictureOf "treated pine and colorbond". Answering one because the other is there is the commonest way this goes wrong.

Just the thing itself - not the sentence, and not the words "pictures of", which are already understood.

askedKind
What kind of answer IN WORDS they are owed. This and pictureOf are independent — one message can want both, either, or neither, and neither field may decide the other.
"rates" when they are asking what something costs in general — "what does colorbond go for", "which is cheaper".
"advice" for every other fencing question asked in words — which of two is better, permits, damage, process, maintenance, how long it lasts.
Null when they ONLY asked to be shown and asked nothing in words. Null when askedAbout is null.

  "show me colorbond"                                       -> null, and pictureOf "colorbond"
  "have you got pictures of treated pine"                   -> null, and pictureOf "treated pine"
  "what colours does it come in"                            -> null, and pictureOf — a colour is seen, not explained
  "is colorbond better than timber"                         -> "advice", and pictureOf null
  "which is better, and show me pictures of both"           -> "advice" AND pictureOf. Both.
  "what's colorbond going for, and what does it look like"  -> "rates" AND pictureOf. Both again.

Those last two are where this goes wrong. Setting only one of them because the message leans that way drops half of what they asked for, and they notice.

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
  pictureOf: null,
  mentionedOldFence: false,
  namedOffList: null,
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
