import type { Trade } from '../shared/vocab.js';
import type { VerifiedCapabilities, VerifiedPricing } from '../validation/verify.js';

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
