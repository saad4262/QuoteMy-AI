import type { Trade } from '../shared/vocab.js';
import type {
  BusinessRepository,
  CapabilitiesDoc,
  PricingDoc,
  PricingStatus,
  SubmissionRecord,
} from './types.js';

/**
 * In-memory stand-in for Firestore. Same interface, same document shapes, same collection paths in
 * spirit — so wiring Firebase later is a new implementation of this file and nothing else changes.
 * Data lives for the life of the process, which is exactly what Postman testing needs.
 */
export class MemoryRepository implements BusinessRepository {
  readonly kind = 'memory' as const;

  private pricing = new Map<string, PricingDoc>();
  private capabilities = new Map<string, CapabilitiesDoc>();
  private submissions: SubmissionRecord[] = [];

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

  /** Tests only. */
  clear(): void {
    this.pricing.clear();
    this.capabilities.clear();
    this.submissions = [];
  }
}
