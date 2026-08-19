# QuoteMy AI — n8n MVP

Two-sided AI marketplace (homeowners ↔ tradespeople, Australia). Full architecture context lives in `CONTEXT.md` — read it before making changes here. This file only records decisions that diverge from it, plus working conventions for this project.

## MVP scope (current)

- **Everything runs in n8n.** The Node.js gateway described in `CONTEXT.md` is dropped for the MVP. n8n workflows do the work directly; the React frontend (already built) talks to Firebase directly for auth and initial writes, and to n8n webhooks for AI processing.
- **Business AI first.** Today's — and the near-term — focus is the business onboarding/extraction pipeline (`CONTEXT.md` Sheet 02), not the customer-matching side.
- **Fencing only, first.** Prove one trade end-to-end before copy-adapting SOPs/schemas to tiling, decking, retaining wall (matches `CONTEXT.md`'s own Day-9 gate).
- **n8n does not verify auth.** Firebase Auth + the initial raw-description write are handled by the frontend directly. n8n trusts webhook payloads.
- **Synchronous webhook response**, plus a Firestore write on the approved path. Webhook uses `responseMode: responseNode` with a `Respond to Webhook` node per branch. Status lifecycle: frontend writes `pending` → n8n returns/writes `verified` or `unverified` → business confirms on the frontend, which sets `confirmedAt` (never set by n8n).
- **Per-trade knowledge lives in Code Tool nodes, not Firestore.** Each trade's SOP/knowledge is a `@n8n/n8n-nodes-langchain.toolCode` node hanging off the review agent, with the text pasted straight into its `return \`...\`;` block. Adding a trade = duplicating that node and pasting new text. No Firestore `sops/` docs, no sub-workflow lookups, no vector DB (`CONTEXT.md` §9 rules out embeddings anyway).
- **Keep it simple — the user has asked for this repeatedly.** No hash/change-detection, no pre-gate branches, no separate schema-fetch nodes, exactly two agents. The review agent is the gate; the extraction schema is inline in its Structured Output Parser. Don't add stages back without being asked.

The concrete plan for this phase is at `.claude/plans/` (see the most recent plan file) and mirrored in `n8n/workflows/` in this repo, with the Node port planned in `docs/PLAN.md`.

## Non-negotiables (from CONTEXT.md §7 — still apply, moving off Node changes nothing here)

1. Strict `json_schema` for every extraction call, never `json_object`.
2. Every extracted number must carry its exact source sentence; a code step string-matches it against the raw text and drops the field if it doesn't match.
3. No price goes live without a human (the business) explicitly confirming it.
4. The model never does arithmetic.
5. One trade per extraction call.
6. Give the model an `unmapped`/gaps outlet — never force it to guess or silently drop content.
7. Validate, retry exactly once. Two failures means the prompt is wrong — flag it, don't loop.

**The user's standing instruction: in business AI, accuracy matters more than response speed. Do not trade correctness for latency on this side of the product.**

**The review report is written for a tradesperson on a phone after work — short wins over thorough.** Hard limit: **under 250 words, 3–5 bullets**. The single most important instruction in the review prompt is to **group every problem needing the same action into one bullet** (three separate "POA" lines become one line naming all three) — the prompt carries a worked wrong/right example because "group similar issues" alone gets ignored. Tone: helpful person who knows the trade, plain words, direct and warm. Banned: rule numbers, categories, counts, tool names, JSON, lecturing, scolding, exclamation marks, and any "what you did well" section (goodPoints was removed on request). Both report builders emit `reportWordCount` so length drift is visible without reading the output.

This went through three tone iterations — over-warm, then over-formal (compliance-report style, rejected as too long and technical), now short and plain. Don't drift back toward either extreme.

**Models: both agents run `gpt-4o` ($2.50/$10 per 1M), ~$20/mo for 200 businesses.** The GPT-5.6 family (Sol $5/$30, Terra $2/$12, Luna $0.20/$1.20, GA 9 July 2026) was tried and **does not work with n8n's `lmChatOpenAi` node** — it requires OpenAI's `/v1/responses` endpoint while the node posts to `/v1/chat/completions`. Do not re-suggest GPT-5.6 on the built-in node, and do not "fix" it by switching to an HTTP Request node — that trades away the whole Agent cluster (tool calling, output parsing) to change one model, and the user has corrected HTTP-Request-over-built-in-nodes twice already. Model IDs and prices are post-cutoff: **verify on the web, never from memory**, and give a cost estimate before changing one. Never drop to a mini/nano tier on either agent.

**Guardrails belong inside the agents, not as gate nodes in front of them** — the user asked for this explicitly after a separate `Input Guardrails` node was tried and rejected. Input checks (empty, too short, no digits, wrong trade) and prompt-injection defence live in Agent 1's system prompt. Output-side checks stay in code (`Format Extraction`): quote verification and plausibility bounds are not judgement calls.

**Both triggers must keep working.** The Webhook sends `{body: {...}}`; the Chat Trigger sends `chatInput` at the item root with no `body`. `Normalize Input` handles both — reading only `body.*` made every chat submission arrive empty and get rejected. The Chat Trigger also needs `responseMode: responseNode` in its options, or the `Respond to Webhook` nodes error.

**The canonical vocabulary is the highest-risk thing in this repo — never let the model invent a key.** `material`, `gateType`, `condition`, `removes`, `unit` and `tags` are closed enums, enforced in the Structured Output Parser **and** re-checked in `Format Extraction` code. That redundancy is deliberate: every other failure here is loud, but vocabulary drift is silent and permanent — `treatedPinePaling` for one business and `timber_pine` for the next makes both invisible to customer search with no error anywhere (`CONTEXT.md` §8). Anything with no home in the vocabulary goes to `unmapped`, never forced into the nearest value. Adding a value = editing both places, treated as a schema migration.

**Never group rates by category as object keys** (`{treatedPinePaling: [...], colorbond: [...]}`) — a Gemini suggestion that was declined, because those keys come from free text and are exactly the drift the enums prevent. `rates` stays a flat array of `{material, heightM, pricePerMetre, sourceQuote}`; code folds it into the nested Firestore map. Height comes back as a **number** (1.8) and code builds the `"1.8m"` key, so it cannot drift either.

**Core rates vs optional extras is a real distinction the rules must keep making.** A core rate (type at a height, per metre) must be one firm number. Optional add-ons — gate motors, powder coating, compliance certificates, callout fees — are allowed to be "from $X" and are never blocking, because they live in `capabilities/{trade}.extras` and `CONTEXT.md` §4 says those never enter the price formula. This already caused one false rejection of a fully compliant submission.

**When writing rules for the agent: an exception in a parenthetical gets ignored.** The "from-pricing is fine on extras" carve-out sat at the end of Rule 4 in brackets while the agent's prompt said flatly that "from $80/m" is the absence of a rate — the agent followed the prompt and rejected a good submission. Carve-outs need their own heading (hence Rule 4a) and must also be stated in the system prompt, not only in the tool text. Keep prompt and tool rules consistent; when they conflict, the prompt wins.

**Check `maxTokens` whenever you change what an agent outputs.** A truncated response fails to parse and reads as a model fault rather than a budget one. Review needs ~1,200 output tokens for a detailed rejection (ceiling 4,000); extraction needs ~2,000 for ~21 rates carrying source sentences (ceiling 8,000).

**Always use n8n's built-in nodes over HTTP Request / custom code — this has been corrected twice now, don't regress on it.** Ground truth is this project's own working reference workflows (business-matching + chat-router subagents, and a full "Tiling AI Agent" cluster), not what generic docs suggest:
- **Any LLM call is an AI Agent cluster**: `@n8n/n8n-nodes-langchain.agent` + its own `lmChatOpenAi` Chat Model (`ai_languageModel`) + `outputParserStructured` (`ai_outputParser`) for the schema. Never a raw HTTP Request to `api.openai.com` and never the plain `n8n-nodes-base.openAi` node — those were both tried and corrected. Add `ai_tool` sub-nodes (`toolWorkflow`/`toolCode`) when the agent genuinely needs to look something up (e.g. per-trade SOP knowledge bases, one tool per trade pointed at a shared "Get SOP" sub-workflow so adding a trade never touches the agent itself). Only skip tools when the call has nothing to look up.
- Firestore reads/writes: `n8n-nodes-base.googleFirebaseCloudFirestore` (typeVersion 1.1), credential `googleFirebaseCloudFirestoreOAuth2Api`. Firestore values sometimes arrive plain and sometimes as a raw typed value (`{stringValue: "..."}`) — the reference code unwraps defensively rather than assuming one shape; do the same in any new Code node reading Firestore output.
- IF nodes: v2.2 filter-condition format (`conditions.conditions[]` with `operator.type`/`operation`), not the legacy v1 shape.
- An Agent's structured-output result can land at `$json.output` as an object, a JSON string, or (rarely) at the item root — a small Code node right after the agent should handle all three rather than assuming one, same principle as the Firestore value unwrap.
- Note: schema #1 above (strict enforcement) rests on the Structured Output Parser + a downstream Code-node validator with one retry, not an OpenAI-API-level `strict: true` flag — neither n8n path available here exposes that flag directly.

## Tooling

- **Ponytail plugin** (`https://github.com/dietrichgebert/ponytail`) should be installed and active for this project — it enforces a "write the minimum necessary code" discipline that matches this project's own no-overengineering stance. It's a Claude Code plugin; install it once, interactively, in a terminal session (not something an agent can do on your behalf):
  ```
  /plugin marketplace add DietrichGebert/ponytail
  /plugin install ponytail@ponytail
  ```
  Once installed it activates automatically per session — no need to re-invoke it per prompt.
