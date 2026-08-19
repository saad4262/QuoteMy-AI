System prompts and SOP text live here as files — the point of the move (docs/PLAN.md §6): a prompt
diff should be readable in review, and `git blame` on a single rule should work.

Planned:
  review.system.md        Agent 1 — the gate. Input guardrails + injection defence live here.
  extraction.system.md    Agent 2 — one trade per call.
  sop/general.md          general onboarding rules (was: Tool: General Onboarding Knowledge)
  sop/fencing.md          fencing rules (was: Tool: Fencing Knowledge Lookup)

Both SOPs are always concatenated into the review prompt — there is no tool for the model to skip.
