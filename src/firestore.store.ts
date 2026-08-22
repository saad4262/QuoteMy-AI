import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { db } from './firebase.js';
import type {
  BusinessRepository,
  CapabilitiesDoc,
  DescriptionDoc,
  PendingSubmission,
  PricingDoc,
  PricingStatus,
  ReviewDoc,
  SubmissionRecord,
  SubmissionStatus,
} from './store.js';
import { CUSTOMER_LABEL_GROUPS, QUESTIONS } from './messages.js';
import { SCHEMA_VERSION } from './store.js';
import type { ExtraValue } from './vocabulary.js';
import { CONDITIONS, GATE_TYPES, MATERIALS, REMOVES, TAGS, TRADES, UNITS, type Trade } from './vocab.js';

/**
 * The Firestore side of the contract the frontend already ships against:
 *
 *   businesses/{uid}/services/{trade}
 *     description/raw            <- the FRONTEND writes; we only set `status` and our work fields
 *     description/lastaireview   <- we write; the frontend listens and shows its panel on
 *                                   displayState === "ready"
 *     jsondata/extracted         <- we write; the customer side searches it
 *     submissions/{id}           <- we append; history for the admin view
 *
 * `businesses/{uid}/pricing/{trade}` is the legacy shape and is not touched here at all.
 *
 * Everything this class writes goes through the Admin SDK, which bypasses security rules. That is
 * deliberate and it is why the rules can forbid the business from writing its own approval.
 */
export class FirestoreRepository implements BusinessRepository {
  readonly kind = 'firestore' as const;

  private service = (uid: string, trade: Trade) =>
    db().collection('businesses').doc(uid).collection('services').doc(trade);

  private rawRef = (uid: string, trade: Trade) =>
    this.service(uid, trade).collection('description').doc('raw');

  private reviewRef = (uid: string, trade: Trade) =>
    this.service(uid, trade).collection('description').doc('lastaireview');

  private extractedRef = (uid: string, trade: Trade) =>
    this.service(uid, trade).collection('jsondata').doc('extracted');

  // --- the extracted JSON, for customer search ------------------------------------------------

  /**
   * Pricing and capabilities are two halves of one document here, though the pipeline produces
   * them separately: the customer side should answer "does this business do 1.8m Colorbond in
   * Berwick" with a single read, not two.
   *
   * `data` is the frontend contract's field; its shape is ours. `status` and `confirmedAt` sit at
   * the root so the customer query stays a top-level filter.
   */
  /**
   * `mergeFields`, not `merge: true`.
   *
   * Firestore's plain merge MERGES a nested map instead of replacing it, so `data.pricing.rates`
   * accumulated across submissions: a business that listed chainmesh once and then dropped it from
   * their price list kept a chainmesh rate forever, and would be quoted for a fence they no longer
   * build. It also left `rates` and `enabledMaterials` disagreeing, which is how this was found.
   *
   * Naming the field paths makes each one a replacement while leaving everything else on the
   * document alone - so this write cannot clobber `capabilities`, and that one cannot clobber this.
   *
   * Each submission is a complete price list, so replacing is the correct reading: what the
   * business sent this time is what they sell, and nothing is live until they confirm it.
   */
  async savePricing(uid: string, doc: PricingDoc): Promise<void> {
    const { trade, status, schemaVersion, updatedAt, confirmedAt, ratesSaved, ...pricing } = doc;
    await this.extractedRef(uid, trade).set(
      {
        data: { trade, schemaVersion, pricing, ratesSaved: ratesSaved ?? 0 },
        status,
        confirmedAt: confirmedAt ?? null,
        updatedAt: updatedAt ?? FieldValue.serverTimestamp(),
      },
      {
        mergeFields: [
          'data.trade', 'data.schemaVersion', 'data.pricing', 'data.ratesSaved',
          'status', 'confirmedAt', 'updatedAt',
        ],
      },
    );
    await this.service(uid, trade).set({ trade, status, lastReviewedAt: updatedAt }, { merge: true });
  }

  async saveCapabilities(uid: string, doc: CapabilitiesDoc): Promise<void> {
    const { trade, schemaVersion, updatedAt, ...capabilities } = doc;
    await this.extractedRef(uid, trade).set(
      { data: { trade, schemaVersion, capabilities }, updatedAt },
      { mergeFields: ['data.trade', 'data.schemaVersion', 'data.capabilities', 'updatedAt'] },
    );
  }

  async getPricing(uid: string, trade: Trade): Promise<PricingDoc | null> {
    const snap = await this.extractedRef(uid, trade).get();
    if (!snap.exists) return null;
    const d = snap.data() as DocumentData;
    const data = d.data ?? {};
    if (!data.pricing) return null;
    return {
      ...data.pricing,
      trade,
      status: d.status,
      schemaVersion: data.schemaVersion,
      ratesSaved: data.ratesSaved,
      updatedAt: toIso(d.updatedAt),
      confirmedAt: toIso(d.confirmedAt),
    } as PricingDoc;
  }

  async getCapabilities(uid: string, trade: Trade): Promise<CapabilitiesDoc | null> {
    const snap = await this.extractedRef(uid, trade).get();
    if (!snap.exists) return null;
    const data = (snap.data() as DocumentData).data ?? {};
    if (!data.capabilities) return null;
    return {
      ...data.capabilities,
      trade,
      schemaVersion: data.schemaVersion,
      updatedAt: toIso((snap.data() as DocumentData).updatedAt),
    } as CapabilitiesDoc;
  }

  async setStatus(uid: string, trade: Trade, status: PricingStatus): Promise<PricingDoc | null> {
    await this.extractedRef(uid, trade).set(
      { status, updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
    return this.getPricing(uid, trade);
  }

  /**
   * The business saying yes. This is the only thing that makes prices visible to customers - the
   * pipeline writes `verified`, a human writes `confirmed`.
   */
  async confirm(uid: string, trade: Trade, at: string): Promise<PricingDoc | null> {
    await this.extractedRef(uid, trade).set(
      { status: 'confirmed', confirmedAt: at, updatedAt: at },
      { merge: true },
    );
    await this.service(uid, trade).set({ status: 'confirmed' }, { merge: true });
    return this.getPricing(uid, trade);
  }

  // --- history --------------------------------------------------------------------------------

  async addSubmission(record: SubmissionRecord): Promise<void> {
    await this.service(record.uid, record.trade).collection('submissions').doc(record.id).set(record);
  }

  async listSubmissions(uid: string, trade?: Trade): Promise<SubmissionRecord[]> {
    const trades = trade ? [trade] : [...TRADES];
    const results: SubmissionRecord[] = [];
    for (const t of trades) {
      const snap = await this.service(uid, t)
        .collection('submissions')
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();
      results.push(...snap.docs.map((d) => d.data() as SubmissionRecord));
    }
    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // --- the submission queue --------------------------------------------------------------------

  async getDescription(uid: string, trade: Trade): Promise<DescriptionDoc | null> {
    const snap = await this.rawRef(uid, trade).get();
    return snap.exists ? (snap.data() as DescriptionDoc) : null;
  }

  async getLastReview(uid: string, trade: Trade): Promise<ReviewDoc | null> {
    const snap = await this.reviewRef(uid, trade).get();
    return snap.exists ? (snap.data() as ReviewDoc) : null;
  }

  /**
   * Take ownership of a submission, or find out someone else already has it.
   *
   * One transaction, one winner - so the HTTP nudge and the sweeper can race freely and only one
   * will do the work. That is the entire locking mechanism: no queue service, no leases.
   *
   * A submission stuck in `processing` is claimable again once it goes stale, which is how a run
   * killed halfway gets finished by the next one.
   */
  async claimSubmission(
    uid: string,
    trade: Trade,
    staleMs = 600_000,
    maxAttempts = 3,
  ): Promise<DescriptionDoc | null> {
    const ref = this.rawRef(uid, trade);

    return db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;

      const doc = snap.data() as DescriptionDoc;
      if (doc.status !== 'pending') return null; // already answered

      // Work state belongs to whichever submission it names; anything else is a fresh start.
      const sameSubmission = doc.aiSubmissionId === doc.submissionId;
      const attempts = sameSubmission ? (doc.aiAttempts ?? 0) : 0;

      if (sameSubmission && doc.aiWorkStatus === 'processing') {
        const startedMs = toMillis(snap.get('aiStartedAt'));
        if (Date.now() - startedMs < staleMs) return null; // someone else is on it
      }

      if (attempts >= maxAttempts) return null; // the worker's give-up path handles this

      tx.update(ref, {
        aiSubmissionId: doc.submissionId,
        aiWorkStatus: 'processing',
        aiAttempts: attempts + 1,
        aiStartedAt: FieldValue.serverTimestamp(),
      });

      return { ...doc, aiSubmissionId: doc.submissionId, aiWorkStatus: 'processing', aiAttempts: attempts + 1 };
    });
  }

  /** The frontend opens its panel on `displayState: "ready"` and on nothing else. */
  async saveReview(uid: string, trade: Trade, review: ReviewDoc): Promise<void> {
    await this.reviewRef(uid, trade).set({ ...review, updatedAt: FieldValue.serverTimestamp() });
    await this.service(uid, trade).set(
      { trade, lastReviewedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  }

  /** The approval answer, and the end of our work fields - the submission is finished either way. */
  async completeSubmission(
    uid: string,
    trade: Trade,
    status: Exclude<SubmissionStatus, 'pending'>,
  ): Promise<void> {
    await this.rawRef(uid, trade).update({
      status,
      aiWorkStatus: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Hand it back for another go. Without this a failed attempt sits in `processing` until the
   * stale window passes, which turns three tries into half an hour of the business staring at
   * nothing. The attempt counter still caps how many times this can happen.
   */
  async requeueSubmission(uid: string, trade: Trade): Promise<void> {
    await this.rawRef(uid, trade).update({
      aiWorkStatus: 'queued',
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  /**
   * Everything waiting, across every business.
   *
   * The `description` collection holds TWO documents - `raw` and `lastaireview` - and both have a
   * `status` field. Today their values differ so the query alone is safe, which is exactly the kind
   * of accident that breaks quietly later, so the document id is checked as well.
   *
   * Firestore will ask for a single-field collection-group index on `status` the first time this
   * runs and print the link.
   */
  async findPending(limit: number, staleMs: number): Promise<PendingSubmission[]> {
    const snap = await db()
      .collectionGroup('description')
      .where('status', '==', 'pending')
      .limit(limit * 4)
      .get();

    const cutoff = Date.now() - staleMs;

    return snap.docs
      .filter((d) => d.ref.id === 'raw')
      .filter((d) => {
        const doc = d.data() as DescriptionDoc;
        if (doc.aiSubmissionId !== doc.submissionId) return true; // never started
        if (doc.aiWorkStatus !== 'processing') return true; // queued, or a retry waiting
        return toMillis(d.get('aiStartedAt')) < cutoff; // stale: a dead run to finish
      })
      .map((d) => pathToSubmission(d.ref.path))
      .filter((s): s is PendingSubmission => s !== null)
      .slice(0, limit);
  }

  // --- the per-trade vocabulary ----------------------------------------------------------------

  private vocabRef = (trade: Trade) => db().collection('schema').doc(trade);

  /**
   * Publish everything the customer side needs to read a trade's vocabulary without importing any
   * TypeScript: the closed lists, the words to show a homeowner, and the question text.
   *
   * Written at boot rather than only when a business introduces an extra - otherwise a trade that
   * nobody has extended has no document at all, and the chat has nothing to read.
   *
   * `extras` is deliberately absent from this write: it belongs to the businesses, and a boot must
   * never overwrite what they have taught the system.
   */
  async syncTradeSchema(trade: Trade): Promise<void> {
    await this.vocabRef(trade).set(
      {
        trade,
        core: {
          materials: [...MATERIALS], gateTypes: [...GATE_TYPES], conditions: [...CONDITIONS],
          removes: [...REMOVES], units: [...UNITS], tags: [...TAGS],
        },
        labels: CUSTOMER_LABEL_GROUPS,
        questions: QUESTIONS,
        schemaVersion: SCHEMA_VERSION,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { mergeFields: ['trade', 'core', 'labels', 'questions', 'schemaVersion', 'updatedAt'] },
    );
  }

  async getTradeVocabulary(trade: Trade): Promise<{ extras: Record<string, ExtraValue> } | null> {
    const snap = await this.vocabRef(trade).get();
    if (!snap.exists) return null;
    return { extras: (snap.get('extras') as Record<string, ExtraValue>) ?? {} };
  }

  /**
   * Merged in a transaction, never overwritten. Two businesses submitting at the same moment must
   * both be counted, and one must not erase the other's aliases - the aliases are the whole reason
   * the next business recognises the same offering however they phrase it.
   *
   * `core` is written here too, from vocab.ts, so the document is readable on its own by the
   * customer side without importing TypeScript. It is a mirror, never an input.
   */
  async mergeTradeExtras(trade: Trade, seen: { slug: string; label: string }[]): Promise<void> {
    const ref = this.vocabRef(trade);
    const at = new Date().toISOString();

    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const extras = ((snap.exists ? snap.get('extras') : {}) ?? {}) as Record<string, ExtraValue>;

      for (const { slug, label } of seen) {
        const existing = extras[slug];
        extras[slug] = existing
          ? {
              ...existing,
              aliases: [...new Set([...(existing.aliases ?? []), label.toLowerCase()])].slice(0, 12),
              businessCount: (existing.businessCount ?? 0) + 1,
              lastSeen: at,
            }
          : { label, aliases: [label.toLowerCase()], businessCount: 1, firstSeen: at, lastSeen: at };
      }

      tx.set(
        ref,
        {
          trade,
          core: {
            materials: [...MATERIALS], gateTypes: [...GATE_TYPES], conditions: [...CONDITIONS],
            removes: [...REMOVES], units: [...UNITS], tags: [...TAGS],
          },
          extras,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });
  }
}

/** Firestore hands back a Timestamp, an ISO string, or nothing, depending on who wrote it. */
function toMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === 'string') return Date.parse(value) || 0;
  return 0;
}

function toIso(value: unknown): string | null {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === 'string') return value;
  return null;
}

/** businesses/{uid}/services/{trade}/description/raw -> { uid, trade } */
function pathToSubmission(path: string): PendingSubmission | null {
  const parts = path.split('/');
  const uid = parts[1];
  const trade = parts[3];
  if (!uid || !trade || !(TRADES as readonly string[]).includes(trade)) return null;
  return { uid, trade: trade as Trade };
}
