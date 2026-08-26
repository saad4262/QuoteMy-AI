/**
 * The parts of the customer chat's vocabulary that are NOT a trade's business vocabulary.
 *
 * Materials, gate types, conditions and removals all come from `schema/{trade}` in Firestore at
 * runtime (see `schema.ts`) - never from here - so a business-side change reaches the chat
 * without a redeploy. What is left is the option lists for the two things no business publishes
 * rates against. Which fields exist and what order they are asked in moved to `fieldSpec.ts`, on
 * its way to the trade's own schema document.
 */

/** Not a vocabulary: a length is a measurement and a quantity is a count. Same "3 + Other" paging. */
export const LENGTHS = [10, 15, 20, 25, 30, 40, 50, 60, 80, 100] as const;
export const QUANTITIES = [1, 2, 3, 4, 5, 6] as const;

/**
 * Used when the trade's schema publishes no `core.heights`, which is the case today. A height
 * nobody nearby actually builds at is caught at the end instead, by the alternatives fallback in
 * `priceAndRank.ts`, where the answer is "here is what somebody CAN do" rather than a dead end.
 */
export const HEIGHT_FALLBACK = ['1.2m', '1.5m', '1.8m', '2.1m', '0.9m', '1.35m', '2.4m'] as const;

/**
 * The field a customer's answer fills.
 *
 * A plain string as of step 9: which keys exist is the trade's business, published in its schema
 * document, and a union here could only ever list one trade's. What that costs in compile-time
 * safety is bought back at load time instead - `loadTradeSchema` rejects a document whose fields
 * name an unknown type, an empty source or a dependency on a field that does not exist, and falls
 * back to the compiled spec rather than letting a bad document reach a customer.
 */
export type ChecklistField = string;

/* The order questions are asked in - and which fields there are at all - now lives in
   `fieldSpec.ts` as `FENCING_FIELDS`. The rule it encodes is unchanged: the first field still empty
   is the one asked next, which is what guarantees nothing is skipped and nothing is asked twice. */
