import type { ExtraValue } from './vocabulary.js';
import type { Trade } from './vocab.js';
import type { VerifiedCapabilities, VerifiedOffering, VerifiedPricing } from './verify.js';

/**
 * Status lifecycle (CONTEXT.md §7.3 — no price goes live without a human confirming it):
 *
 *   pending      the business has submitted, nothing processed yet
 *   unverified   processed, but nothing usable survived verification
 *   verified     processed and checked — still NOT live
 *   confirmed    the business confirmed it on their own screen. Only this makes prices live.
 *
 * `confirmedAt` is only ever set by the confirm endpoint, which is an explicit human action.
 * The pipeline must never set it.
 */
export type PricingStatus = 'pending' | 'unverified' | 'verified' | 'confirmed';

export interface PricingDoc extends VerifiedPricing {
  trade: Trade;
  status: PricingStatus;
  schemaVersion: number;
  updatedAt: string;
  confirmedAt: string | null;
  ratesSaved?: number;
}

export interface CapabilitiesDoc extends VerifiedCapabilities {
  trade: Trade;
  /** The long tail: what they offer that has no core value. Searched by text, not by exact match. */
  otherOfferings: VerifiedOffering[];
  couldNotUse: string[];
  schemaVersion: number;
  updatedAt: string;
}

export interface SubmissionRecord {
  id: string;
  uid: string;
  trade: Trade;
  approved: boolean;
  status: PricingStatus;
  ratesSaved: number;
  createdAt: string;
}

/**
 * A file the business attached, as the frontend recorded it in Firestore.
 *
 * `path` is what this service reads by - the Admin SDK fetches straight from the bucket, which
 * works on a private bucket and does not depend on a download token that can be revoked. `url` is
 * only there so the business can see their own file again.
 */
export interface SubmissionFile {
  name: string;
  path: string;
  url?: string;
  contentType?: string;
  size?: number;
}

/**
 * `description/raw`, written by the FRONTEND when the business presses Save - before this service
 * hears about it at all. That is what makes the raw description survive whatever the AI later
 * decides, and what makes a refresh safe.
 *
 * `status` is the frontend's field and means APPROVAL, not progress:
 *   pending    submitted, waiting on us
 *   accepted   the review approved it
 *   rejected   the review wants changes, or the submission was unreadable
 *   failed     we could not process it at all after several tries - our fault, not theirs
 */
export type SubmissionStatus = 'pending' | 'accepted' | 'rejected' | 'failed';

/**
 * Whether anyone is currently running this submission is a different question from whether it was
 * approved, so it gets its own fields. They are `ai`-prefixed because this service owns them and
 * the frontend never touches them.
 *
 * `aiSubmissionId` says WHICH submission the work state below describes, and that is the whole
 * trick: if the frontend overwrites `raw` on save these fields vanish and reset naturally, and if
 * it merges they survive - in which case a brand-new submission would otherwise look like one
 * already in flight. Comparing the two ids makes the logic right either way, so it never depends
 * on a frontend detail we do not control.
 */
export type WorkStatus = 'queued' | 'processing';

export interface DescriptionDoc {
  submissionId: string;
  text: string;
  files: SubmissionFile[];
  status: SubmissionStatus;
  createdAt?: string;
  updatedAt?: string;

  aiSubmissionId?: string;
  aiWorkStatus?: WorkStatus;
  aiAttempts?: number;
}

/**
 * `description/lastaireview`. The frontend listens to this document and shows its panel only when
 * `displayState` is "ready" - it sets "pending" itself on save and leaves the previous body in
 * place, so a resubmit never blanks the screen while we work.
 */
export interface ReviewDoc {
  displayState: 'ready';
  submissionId: string;
  decision: 'approved' | 'needs_updates' | 'not_a_price_list' | 'failed';
  approved: boolean;
  status: 'verified' | 'unverified';
  [field: string]: unknown;
}

/** One submission waiting to be processed, as the sweeper finds it. */
export interface PendingSubmission {
  uid: string;
  trade: Trade;
}

/**
 * Storage is behind this interface so the pipeline never knows which one it is talking to:
 * MemoryRepository for tests and Postman, FirestoreRepository in production.
 */
export interface BusinessRepository {
  readonly kind: 'memory' | 'firestore';
  savePricing(uid: string, doc: PricingDoc): Promise<void>;
  saveCapabilities(uid: string, doc: CapabilitiesDoc): Promise<void>;
  getPricing(uid: string, trade: Trade): Promise<PricingDoc | null>;
  getCapabilities(uid: string, trade: Trade): Promise<CapabilitiesDoc | null>;
  setStatus(uid: string, trade: Trade, status: PricingStatus): Promise<PricingDoc | null>;
  confirm(uid: string, trade: Trade, at: string): Promise<PricingDoc | null>;
  addSubmission(record: SubmissionRecord): Promise<void>;
  listSubmissions(uid: string, trade?: Trade): Promise<SubmissionRecord[]>;

  getDescription(uid: string, trade: Trade): Promise<DescriptionDoc | null>;
  /** The previous review, so a resubmit can be answered with some memory of the last one. */
  getLastReview(uid: string, trade: Trade): Promise<ReviewDoc | null>;
  /** Transactional: only one runner wins, whether it came from the nudge or the sweeper. */
  claimSubmission(uid: string, trade: Trade, staleMs?: number, maxAttempts?: number): Promise<DescriptionDoc | null>;
  saveReview(uid: string, trade: Trade, review: ReviewDoc): Promise<void>;
  /** The final approval status, and the end of our work fields. */
  completeSubmission(uid: string, trade: Trade, status: Exclude<SubmissionStatus, 'pending'>): Promise<void>;
  /** Hand it back for another go in a couple of minutes, rather than waiting out the stale window. */
  requeueSubmission(uid: string, trade: Trade): Promise<void>;
  /** Everything pending, including anything a dead process left mid-run for longer than `staleMs`. */
  findPending(limit: number, staleMs: number): Promise<PendingSubmission[]>;

  // --- the per-trade vocabulary (src/vocabulary.ts) ---

  /** `schema/{trade}`. Null when the trade has learned nothing yet - core still works. */
  getTradeVocabulary(trade: Trade): Promise<{ extras: Record<string, ExtraValue> } | null>;
  /**
   * The whole `schema/{trade}` document, not just its extras. This is what the customer chat
   * builds its questions and multiple-choice options from, so a business-side vocabulary change
   * reaches the chat without a redeploy. Null when the document does not exist yet.
   */
  getTradeSchema(trade: Trade): Promise<StoredTradeSchema | null>;
  /** Merge, never overwrite: two submissions in flight must both be counted. */
  mergeTradeExtras(trade: Trade, seen: { slug: string; label: string }[]): Promise<void>;
  /** Publish core, labels and questions so the customer side can read the whole vocabulary. */
  syncTradeSchema(trade: Trade): Promise<void>;

  // --- customer-chat matching (src/client/matcher.ts) ---

  /**
   * Every business claiming this trade, for the matcher to filter by distance. A full scan,
   * filtered in code rather than queried - matches n8n's current approach and does not scale
   * forever; flagged, not fixed, in this pass.
   */
  findCandidates(trade: Trade): Promise<BusinessCandidate[]>;
  /** One business's service doc for one trade, read once for both pricing and capabilities. */
  getServiceExtract(uid: string, trade: Trade): Promise<ServiceExtract | null>;

  // --- customer-chat spend (src/client/spend.ts) ---

  /** What the customer chat has spent today, across every instance rather than just this one. */
  readChatSpend(day: string): Promise<number>;
  /** Must be atomic: two instances recording at the same moment have to both count. */
  addChatSpend(day: string, usd: number): Promise<void>;

  // --- the finished quote (src/client/saveResult.ts) ---

  /** `quoteResults/{resultId}`. The one thing this service writes on the customer side. */
  saveQuoteResult(resultId: string, doc: QuoteResultDoc): Promise<void>;
  /** Tests, and anything that needs to read back what a customer was shown. */
  getQuoteResult(resultId: string): Promise<QuoteResultDoc | null>;
}

/**
 * What the frontend renders on the results page.
 *
 * The customer side had nowhere to put this: a chat turn was only ever an HTTP response body, which
 * is fine for a browser that made the request and useless for a voice call, where nothing on screen
 * asked for anything. So the finished quote is written here and the page listens, the same shape of
 * arrangement the business side already has with `description/lastaireview`.
 *
 * `resultId` is generated by this service, never by a caller. It is the whole of the access
 * control: the document is world-readable by design, and an id anyone could guess would hand them a
 * stranger's quote - the businesses, the real prices, their suburb, and whatever they were quoted
 * elsewhere.
 */
export interface QuoteResultDoc {
  /** The frontend shows its panel only when this says ready, exactly as `lastaireview` works. */
  displayState: 'ready';
  sessionId: string | null;
  trade: string;
  intent: string;
  message: string;
  /** Empty, with a `noMatchReason`, when nobody could quote the job - that is still a result. */
  results: unknown[];
  comparison: unknown;
  alternatives: unknown;
  /** The brief the quote answers, minus `_ui` - session mechanics are not part of a quote. */
  checklist: Record<string, unknown>;
  checklistDisplay: unknown;
  noMatchReason: string | null;
  updatedAt: string;
}

/**
 * The `businesses/{uid}` root record, as the frontend writes it directly - this service never
 * creates or edits one. Read-only from here, and only ever in bulk, for the customer chat's
 * candidate search.
 */
export interface BusinessCandidate {
  uid: string;
  businessName: string;
  servicesProvided: string[];
  rating: number | null;
  reviewCount: number | null;
  isAutoAcceptEnabled: boolean;
  isAiAutoAcceptEnabled: boolean;
}

/**
 * One business's published service doc for one trade, read for matching/pricing rather than for
 * the business's own onboarding flow - `pricing`/`capabilities` are the exact `VerifiedPricing`/
 * `VerifiedCapabilities` shapes `verify.ts` produces and `savePricing`/`saveCapabilities` store,
 * read together in one Firestore call instead of the two `getPricing`/`getCapabilities` cost.
 */
export interface ServiceExtract {
  status: PricingStatus | null;
  pricing: VerifiedPricing | null;
  capabilities: (VerifiedCapabilities & { otherOfferings: VerifiedOffering[] }) | null;
}

/**
 * `schema/{trade}` exactly as it sits in Firestore. Everything is optional because this document
 * is read by the customer chat at runtime and must never be able to break a conversation: a
 * missing field falls back to the compiled vocabulary rather than emptying a question.
 *
 * `core.heights` is not written by `syncTradeSchema` today - it is read here because n8n's schema
 * supported it (flat list, or a map keyed by material for trades whose heights differ by type)
 * and it costs nothing to keep the door open.
 */
export interface StoredTradeSchema {
  core?: {
    materials?: string[];
    gateTypes?: string[];
    conditions?: string[];
    removes?: string[];
    heights?: string[] | Record<string, string[]>;
  };
  labels?: {
    materials?: Record<string, string>;
    gateTypes?: Record<string, string>;
    conditions?: Record<string, string>;
    removes?: Record<string, string>;
  };
  questions?: Record<string, string>;
  /**
   * The trade's checklist: which fields it has, in what order, and where each one's answers come
   * from. Deliberately `unknown[]` - it arrives from a document anyone with console access can
   * edit, so it is validated in `client/schema.ts` before a single field of it is trusted.
   */
  fields?: unknown[];
  extras?: Record<string, ExtraValue>;
}

/** 2 (2026-08-26): `schema/{trade}` gained `fields` - the checklist itself, published rather than compiled. */
export const SCHEMA_VERSION = 2;

/**
 * In-memory stand-in for Firestore. Same interface, same document shapes - so wiring Firebase later
 * is a new class in this file and nothing else changes.
 * Data lives for the life of the process, which is exactly what Postman testing needs.
 */
export class MemoryRepository implements BusinessRepository {
  readonly kind = 'memory' as const;

  private pricing = new Map<string, PricingDoc>();
  private capabilities = new Map<string, CapabilitiesDoc>();
  private submissions: SubmissionRecord[] = [];
  private candidates = new Map<string, BusinessCandidate>();

  private key = (uid: string, trade: Trade) => `${uid}::${trade}`;

  async savePricing(uid: string, doc: PricingDoc): Promise<void> {
    this.pricing.set(this.key(uid, doc.trade), doc);
  }

  async saveCapabilities(uid: string, doc: CapabilitiesDoc): Promise<void> {
    this.capabilities.set(this.key(uid, doc.trade), doc);
  }

  async getPricing(uid: string, trade: Trade): Promise<PricingDoc | null> {
    return this.pricing.get(this.key(uid, trade)) ?? null;
  }

  async getCapabilities(uid: string, trade: Trade): Promise<CapabilitiesDoc | null> {
    return this.capabilities.get(this.key(uid, trade)) ?? null;
  }

  async setStatus(uid: string, trade: Trade, status: PricingStatus): Promise<PricingDoc | null> {
    const doc = this.pricing.get(this.key(uid, trade));
    if (!doc) return null;
    const next = { ...doc, status, updatedAt: new Date().toISOString() };
    this.pricing.set(this.key(uid, trade), next);
    return next;
  }

  async confirm(uid: string, trade: Trade, at: string): Promise<PricingDoc | null> {
    const doc = this.pricing.get(this.key(uid, trade));
    if (!doc) return null;
    const next: PricingDoc = { ...doc, status: 'confirmed', confirmedAt: at, updatedAt: at };
    this.pricing.set(this.key(uid, trade), next);
    return next;
  }

  async addSubmission(record: SubmissionRecord): Promise<void> {
    this.submissions.unshift(record);
  }

  async listSubmissions(uid: string, trade?: Trade): Promise<SubmissionRecord[]> {
    return this.submissions.filter((s) => s.uid === uid && (!trade || s.trade === trade));
  }

  // The queue only exists in Firestore. In memory the caller hands the text straight to the
  // pipeline, so there is nothing to claim and nothing to sweep.
  async getDescription(): Promise<DescriptionDoc | null> {
    return null;
  }
  async getLastReview(): Promise<ReviewDoc | null> {
    return null;
  }
  async claimSubmission(): Promise<DescriptionDoc | null> {
    return null;
  }
  async saveReview(): Promise<void> {}
  async completeSubmission(): Promise<void> {}
  async requeueSubmission(): Promise<void> {}
  async findPending(): Promise<PendingSubmission[]> {
    return [];
  }

  // In memory the vocabulary is whatever this process has seen, which is what makes the
  // second-business behaviour testable without Firestore.
  private extras = new Map<Trade, Record<string, ExtraValue>>();

  async getTradeVocabulary(trade: Trade) {
    const extras = this.extras.get(trade);
    return extras ? { extras } : null;
  }

  /**
   * In memory there is no published document, only whatever extras this process has seen. The
   * client-side loader treats that as "core came from code" and fills the rest from the compiled
   * vocabulary - which is exactly the offline behaviour tests want.
   */
  async getTradeSchema(trade: Trade): Promise<StoredTradeSchema | null> {
    const extras = this.extras.get(trade);
    return extras ? { extras } : null;
  }

  async mergeTradeExtras(trade: Trade, seen: { slug: string; label: string }[]): Promise<void> {
    const extras = this.extras.get(trade) ?? {};
    const at = new Date().toISOString();
    for (const { slug, label } of seen) {
      const existing = extras[slug];
      extras[slug] = existing
        ? {
            ...existing,
            aliases: [...new Set([...existing.aliases, label.toLowerCase()])],
            businessCount: existing.businessCount + 1,
            lastSeen: at,
          }
        : { label, aliases: [label.toLowerCase()], businessCount: 1, firstSeen: at, lastSeen: at };
    }
    this.extras.set(trade, extras);
  }

  async syncTradeSchema(): Promise<void> {} // nothing to publish to, in memory

  // --- customer-chat matching ---

  async findCandidates(trade: Trade): Promise<BusinessCandidate[]> {
    return [...this.candidates.values()].filter((c) => c.servicesProvided.includes(trade));
  }

  async getServiceExtract(uid: string, trade: Trade): Promise<ServiceExtract | null> {
    const pricing = this.pricing.get(this.key(uid, trade)) ?? null;
    const capabilities = this.capabilities.get(this.key(uid, trade)) ?? null;
    if (!pricing && !capabilities) return null;
    return { status: pricing?.status ?? null, pricing, capabilities };
  }

  // In memory the counter is this process's own, which is exactly the behaviour the shared one
  // replaces - and exactly what a test wants, since each test gets a fresh repository.
  private chatSpend = new Map<string, number>();

  async readChatSpend(day: string): Promise<number> {
    return this.chatSpend.get(day) ?? 0;
  }

  async addChatSpend(day: string, usd: number): Promise<void> {
    this.chatSpend.set(day, (this.chatSpend.get(day) ?? 0) + usd);
  }

  private quoteResults = new Map<string, QuoteResultDoc>();

  async saveQuoteResult(resultId: string, doc: QuoteResultDoc): Promise<void> {
    this.quoteResults.set(resultId, doc);
  }

  async getQuoteResult(resultId: string): Promise<QuoteResultDoc | null> {
    return this.quoteResults.get(resultId) ?? null;
  }

  /** Tests only - registers a business the candidate search can find. */
  addCandidate(candidate: BusinessCandidate): void {
    this.candidates.set(candidate.uid, candidate);
  }

  /** Tests only. */
  clear(): void {
    this.pricing.clear();
    this.capabilities.clear();
    this.candidates.clear();
    this.submissions = [];
    this.extras.clear();
    this.chatSpend.clear();
    this.quoteResults.clear();
  }
}

let repository: BusinessRepository = new MemoryRepository();

export const getRepository = (): BusinessRepository => repository;

/** Tests only - and how Firestore is swapped in without touching anything else. */
export const setRepository = (repo: BusinessRepository): void => {
  repository = repo;
};
