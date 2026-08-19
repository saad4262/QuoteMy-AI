import { env } from '../config/env.js';
import { MemoryRepository } from './memory.repository.js';
import type { BusinessRepository } from './types.js';

let repository: BusinessRepository = new MemoryRepository();

if (env.STORE === 'firestore') {
  // Deliberately not implemented yet — Firebase is wired up in a later step (docs/FLOW.md §15, D).
  throw new Error('STORE=firestore is not implemented yet; use STORE=memory');
}

export const getRepository = (): BusinessRepository => repository;

/** Tests only. */
export const setRepository = (repo: BusinessRepository): void => {
  repository = repo;
};

export * from './types.js';
