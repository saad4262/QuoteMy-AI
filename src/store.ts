import type { Trade } from './vocab.js';
import type { VerifiedCapabilities, VerifiedPricing } from './verify.js';

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
}

export interface CapabilitiesDoc extends VerifiedCapabilities {
  trade: Trade;
  unmapped: string[];
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
 * Storage is behind this interface so the pipeline never knows which one it is talking to.
 * Today: memory. Later: Firestore, with businesses/{uid}/pricing|capabilities/{trade}.
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
}

export const SCHEMA_VERSION = 1;

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

let repository: BusinessRepository = new MemoryRepository();

export const getRepository = (): BusinessRepository => repository;

/** Tests only - and how Firestore will be swapped in later without touching anything else. */
export const setRepository = (repo: BusinessRepository): void => {
  repository = repo;
};
