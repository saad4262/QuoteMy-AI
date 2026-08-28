import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore';
import { logger } from './config.js';
import { db } from './firebase.js';
import type {
  BusinessCandidate,
  BusinessRepository,
  CapabilitiesDoc,
  DescriptionDoc,
  PendingSubmission,
  PricingDoc,
  PricingStatus,
  QuoteResultDoc,
  ReviewDoc,
  ServiceExtract,
  StoredTradeSchema,
  SubmissionRecord,
  SubmissionStatus,
  VoiceSession,
} from './store.js';
import { describeFieldDrift, FENCING_FIELDS } from './client/fieldSpec.js';
import { CUSTOMER_LABEL_GROUPS, QUESTIONS } from './messages.js';
import { SCHEMA_VERSION } from './store.js';
import type { VerifiedCapabilities, VerifiedOffering, VerifiedPricing } from './verify.js';
import { readyForPromotion, resolveExisting, type ExtraValue } from './vocabulary.js';
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
   * SEED the trade's vocabulary document - never overwrite it.
   *
   * A trade that nobody has published has no document at all, and the customer chat would have
   * nothing to read, so a first boot writes the compiled vocabulary out in full. After that the
   * document belongs to whoever maintains it: a material added in Firestore survives every
   * restart, which is the whole reason the chat reads it at runtime instead of compiling it in.
   *
   * `extras` is deliberately absent from this write - it belongs to the businesses, and a boot
   * must never overwrite what they have taught the system.
   *
   * The two sides are NOT symmetrical about this document, which is what makes it safe:
   *   - the customer chat reads `core`/`labels`/`questions` from here, so an edit reaches it;
   *   - the business side never does. `verify.ts` validates extraction against `vocab.ts`
   *     directly, so nothing written here can change what is accepted into a price list.
   * That asymmetry is also the risk, and `warnOnSchemaDrift` below is what makes it visible.
   */
  async syncTradeSchema(trade: Trade): Promise<void> {
    const ref = this.vocabRef(trade);
    const compiled = {
      core: {
        materials: [...MATERIALS], gateTypes: [...GATE_TYPES], conditions: [...CONDITIONS],
        removes: [...REMOVES], units: [...UNITS], tags: [...TAGS],
      },
      labels: CUSTOMER_LABEL_GROUPS,
      questions: QUESTIONS,
      fields: FENCING_FIELDS,
    };

    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      // Field by field, so a document that has `core` but predates `questions` still gets the
      // missing half rather than being left with a chat that has no wording to ask with.
      const seed: Record<string, unknown> = {};
      if (!snap.exists || !snap.get('core')) seed.core = compiled.core;
      if (!snap.exists || !snap.get('labels')) seed.labels = compiled.labels;
      if (!snap.exists || !snap.get('questions')) seed.questions = compiled.questions;
      // Same rule as `core`: seeded once so a trade nobody has published still has a chat, and
      // never overwritten afterwards, so an edit made in the console survives the next boot.
      if (!snap.exists || !snap.get('fields')) seed.fields = compiled.fields;
      if (!snap.exists) {
        seed.trade = trade;
        seed.schemaVersion = SCHEMA_VERSION;
      }
      if (!Object.keys(seed).length) return; // already published - leave it exactly as it is

      tx.set(ref, { ...seed, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });

    await this.warnOnSchemaDrift(trade, compiled.core);
  }

  /**
   * The published vocabulary and the compiled one are allowed to differ - that is the point of
   * making the document editable - but nobody should find out by accident.
   *
   * A value published here but missing from `vocab.ts` is the dangerous direction: the chat will
   * offer it, a customer will pick it, and no business can ever be quoted for it because
   * extraction rejects it on the way in. The other direction only means the chat is not offering
   * something businesses could be quoted for.
   *
   * CONTEXT.md §8's warning is that vocabulary drift is the one failure here that is silent and
   * permanent. This is what stops it being silent.
   */
  private async warnOnSchemaDrift(trade: Trade, compiledCore: Record<string, string[]>): Promise<void> {
    const snap = await this.vocabRef(trade).get();
    const published = (snap.get('core') as Record<string, string[]> | undefined) ?? {};

    for (const [field, compiledValues] of Object.entries(compiledCore)) {
      const publishedValues = Array.isArray(published[field]) ? published[field]! : [];
      if (!publishedValues.length) continue;

      const notInCode = publishedValues.filter((v) => !compiledValues.includes(v));
      const notPublished = compiledValues.filter((v) => !publishedValues.includes(v));
      if (!notInCode.length && !notPublished.length) continue;

      logger.warn(
        { trade, field, offeredButNotQuotable: notInCode, quotableButNotOffered: notPublished },
        'schema/{trade} differs from vocab.ts - the chat and the extractor disagree about this trade',
      );
    }

    /* The checklist drifts the same way the vocabulary does, and more quietly: a question dropped
       from the published spec raises no error anywhere, it is simply never asked again. */
    const drift = describeFieldDrift(FENCING_FIELDS, snap.get('fields'));
    if (drift) {
      if (drift.unknownTypes.length) {
        logger.error(
          { trade, fields: drift.unknownTypes },
          'schema/{trade}.fields names a type the code cannot execute - the whole published spec is being ignored',
        );
      }
      if (drift.dropped.length || drift.added.length) {
        logger.warn(
          { trade, neverAsked: drift.dropped, publishedOnly: drift.added },
          'schema/{trade}.fields differs from the compiled checklist',
        );
      }
    }
  }

  async getTradeVocabulary(trade: Trade): Promise<{ extras: Record<string, ExtraValue> } | null> {
    const snap = await this.vocabRef(trade).get();
    if (!snap.exists) return null;
    return { extras: (snap.get('extras') as Record<string, ExtraValue>) ?? {} };
  }

  /**
   * The whole document, for the customer chat. `syncTradeSchema` publishes `core`/`labels`/
   * `questions` here at boot and `mergeTradeExtras` grows `extras`, so this one read is the chat's
   * entire vocabulary - which is what lets a business-side change reach a customer's multiple
   * choice without touching the chat's code.
   */
  async getTradeSchema(trade: Trade): Promise<StoredTradeSchema | null> {
    const snap = await this.vocabRef(trade).get();
    if (!snap.exists) return null;
    const d = snap.data() as DocumentData;
    return {
      core: d.core ?? undefined,
      labels: d.labels ?? undefined,
      questions: d.questions ?? undefined,
      extras: d.extras ?? undefined,
    };
  }

  /**
   * Merged in a transaction, never overwritten. Two businesses submitting at the same moment must
   * both be counted, and one must not erase the other's aliases - the aliases are the whole reason
   * the next business recognises the same offering however they phrase it.
   *
   * Only `extras` is written. `core` used to be republished here on every submission, which
   * quietly undid any edit made to the document between one business submitting and the next -
   * `syncTradeSchema` seeds it once and nothing overwrites it after that.
   */
  async mergeTradeExtras(trade: Trade, seen: { slug: string; label: string }[]): Promise<void> {
    const ref = this.vocabRef(trade);
    const at = new Date().toISOString();

    await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const extras = ((snap.exists ? snap.get('extras') : {}) ?? {}) as Record<string, ExtraValue>;

      for (const { slug, label } of seen) {
        /* The same offering under a different name joins the one that exists rather than starting a
           second. `slugify` already handles a plural; this handles "Bamboo screening" against
           "bamboo screen", which would otherwise be two slugs for one thing - each invisible to a
           search for the other, with no error raised anywhere. */
        const key = extras[slug] ? slug : (resolveExisting(label, extras) ?? slug);
        const existing = extras[key];
        extras[key] = existing
          ? {
              ...existing,
              aliases: [...new Set([...(existing.aliases ?? []), label.toLowerCase()])].slice(0, 12),
              businessCount: (existing.businessCount ?? 0) + 1,
              lastSeen: at,
            }
          : { label, aliases: [label.toLowerCase()], businessCount: 1, firstSeen: at, lastSeen: at };
      }

      /* The one place the trade's own vocabulary is allowed to grow, and it is never the model that
         does it. An extra three independent businesses have all offered has stopped being one
         business's word for something; below that it stays recognised-but-not-offered.

         Adding only. A slug already published keeps its spelling for ever - `CONTEXT.md` §8 - so
         nothing here renames or removes, and a customer mid-conversation cannot lose an answer they
         have already given. */
      const core = ((snap.exists ? snap.get('core') : null) ?? {}) as Record<string, string[]>;
      const labels = ((snap.exists ? snap.get('labels') : null) ?? {}) as Record<string, Record<string, string>>;
      const materials = Array.isArray(core.materials) ? core.materials : [...MATERIALS];
      const promoted = readyForPromotion(extras, materials);

      const write: Record<string, unknown> = { trade, extras, updatedAt: FieldValue.serverTimestamp() };
      if (promoted.length) {
        write.core = { ...core, materials: [...materials, ...promoted] };
        write.labels = {
          ...labels,
          materials: { ...(labels.materials ?? {}), ...Object.fromEntries(promoted.map((slug) => [slug, extras[slug]!.label])) },
        };
        logger.info(
          { trade, promoted, businessCount: promoted.map((slug) => extras[slug]!.businessCount) },
          'extras promoted into the trade vocabulary - every customer is offered these now',
        );
      }

      tx.set(ref, write, { merge: true });
    });
  }

  // --- customer-chat matching (src/client/matcher.ts) ---

  /**
   * `businesses/{uid}` is owned and written by the frontend, not this service - read-only here,
   * and only for the candidate search. A query on `services_provided` rather than n8n's full
   * collection scan: same result, no reason to keep the less scalable version just for fidelity.
   * `array-contains` needs no composite index.
   */
  async findCandidates(trade: Trade): Promise<BusinessCandidate[]> {
    const snap = await db().collection('businesses').where('services_provided', 'array-contains', trade).get();
    return snap.docs.map((doc) => {
      const data = doc.data() as DocumentData;
      const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
      return {
        uid: typeof data.uid === 'string' && data.uid ? data.uid : doc.id,
        businessName: typeof data.businessName === 'string' && data.businessName ? data.businessName : 'Unnamed business',
        servicesProvided: Array.isArray(data.services_provided) ? (data.services_provided as string[]) : [],
        rating: num(data.rating),
        reviewCount: num(data.reviewCount),
        isAutoAcceptEnabled: data.isAutoAcceptEnabled === true,
        isAiAutoAcceptEnabled: data.isAiAutoAcceptEnabled === true,
      };
    });
  }

  /**
   * `pricing` and `capabilities` here are read exactly as `verifyExtraction` produced and
   * `savePricing`/`saveCapabilities` stored them - one read instead of the two `getPricing` +
   * `getCapabilities` would cost, which matters once this runs per candidate business.
   */
  /**
   * `chatSpend/{day}` - one document a day, shared by every instance.
   *
   * A per-process counter is not a ceiling on a platform that runs many of them: each cold start
   * begins at zero, so the real limit is the ceiling multiplied by however many instances happen to
   * be alive. `increment` is applied by the server, so two instances recording at the same moment
   * both count.
   */
  private spendRef = (day: string) => db().collection('chatSpend').doc(day);

  async readChatSpend(day: string): Promise<number> {
    const snap = await this.spendRef(day).get();
    const total = snap.get('usd');
    return typeof total === 'number' && Number.isFinite(total) ? total : 0;
  }

  async addChatSpend(day: string, usd: number): Promise<void> {
    await this.spendRef(day).set({ usd: FieldValue.increment(usd), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  }

  /**
   * `quoteResults/{resultId}` - world-readable by design, so the id is the access control. It is a
   * UUID this service generates; nothing a caller sends ever becomes a document id here.
   */
  private resultRef = (resultId: string) => db().collection('quoteResults').doc(resultId);

  async saveQuoteResult(resultId: string, doc: QuoteResultDoc): Promise<void> {
    await this.resultRef(resultId).set({ ...doc, updatedAt: FieldValue.serverTimestamp() });
  }

  async getQuoteResult(resultId: string): Promise<QuoteResultDoc | null> {
    const snap = await this.resultRef(resultId).get();
    if (!snap.exists) return null;
    const d = snap.data() as DocumentData;
    return { ...d, updatedAt: toIso(d.updatedAt) ?? '' } as QuoteResultDoc;
  }

  /**
   * `voiceSessions/{sessionId}`.
   *
   * In Firestore rather than in memory from the first day, because this runs on a platform that
   * starts fresh processes whenever it likes. An in-memory session would lose every call in flight
   * at a cold start, and the customer would hear a question they had already answered - a failure
   * that looks random and is close to impossible to reproduce.
   */
  private voiceRef = (sessionId: string) => db().collection('voiceSessions').doc(sessionId);

  /** Half an hour. A call that has been quiet longer than that is over, whatever the document says. */
  private static readonly VOICE_TTL_MS = 30 * 60 * 1000;

  async readVoiceSession(sessionId: string): Promise<VoiceSession | null> {
    const snap = await this.voiceRef(sessionId).get();
    if (!snap.exists) return null;
    const d = snap.data() as DocumentData;
    const updatedAt = toMillis(d.updatedAt);
    if (updatedAt && Date.now() - updatedAt > FirestoreRepository.VOICE_TTL_MS) return null;
    return {
      checklist: (d.checklist ?? {}) as Record<string, unknown>,
      place: d.place ?? null,
      options: Array.isArray(d.options) ? d.options : [],
      turns: Array.isArray(d.turns) ? d.turns : [],
      resultId: (d.resultId as string | undefined) ?? null,
      updatedAt: toIso(d.updatedAt) ?? '',
    };
  }

  async writeVoiceSession(sessionId: string, session: VoiceSession): Promise<void> {
    await this.voiceRef(sessionId).set({
      checklist: session.checklist,
      place: session.place ?? null,
      options: session.options,
      turns: session.turns,
      resultId: session.resultId ?? null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  async getServiceExtract(uid: string, trade: Trade): Promise<ServiceExtract | null> {
    const snap = await this.extractedRef(uid, trade).get();
    if (!snap.exists) return null;
    const d = snap.data() as DocumentData;
    const data = d.data ?? {};
    return {
      status: (d.status as PricingStatus | undefined) ?? null,
      pricing: (data.pricing as VerifiedPricing | undefined) ?? null,
      capabilities: (data.capabilities as (VerifiedCapabilities & { otherOfferings: VerifiedOffering[] }) | undefined) ?? null,
    };
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
