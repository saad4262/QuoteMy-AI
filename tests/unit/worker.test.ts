import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppError } from '../../src/http.js';
import {
  MemoryRepository,
  setRepository,
  type DescriptionDoc,
  type ReviewDoc,
  type SubmissionStatus,
} from '../../src/store.js';
import { processSubmission } from '../../src/worker.js';
import { setAiClient } from '../../src/ai.js';
import { MockAiClient } from '../../src/ai.js';

const good = readFileSync('tests/fixtures/description-GOOD-southeast-fencing.txt', 'utf8');
const bad = readFileSync('tests/fixtures/description-BAD-daves-fencing.txt', 'utf8');

/**
 * Stands in for Firestore with the same contract: the frontend's `status` means approval, and the
 * `ai*` fields are ours. Enough of it to exercise the paths that decide what a business sees.
 */
class QueueRepo extends MemoryRepository {
  description: DescriptionDoc | null = null;
  previous: ReviewDoc | null = null;
  reviews: ReviewDoc[] = [];
  requeued = 0;

  async getDescription(): Promise<DescriptionDoc | null> {
    return this.description;
  }

  async getLastReview(): Promise<ReviewDoc | null> {
    return this.previous;
  }

  async claimSubmission(_uid: string, _trade: string, _staleMs = 0, maxAttempts = 3) {
    const doc = this.description;
    if (!doc || doc.status !== 'pending') return null;

    const same = doc.aiSubmissionId === doc.submissionId;
    const attempts = same ? (doc.aiAttempts ?? 0) : 0;
    if (same && doc.aiWorkStatus === 'processing') return null;
    if (attempts >= maxAttempts) return null;

    this.description = {
      ...doc,
      aiSubmissionId: doc.submissionId,
      aiWorkStatus: 'processing',
      aiAttempts: attempts + 1,
    };
    return this.description;
  }

  async saveReview(_uid: string, _trade: string, review: ReviewDoc): Promise<void> {
    this.reviews.push(review);
  }

  async completeSubmission(_uid: string, _trade: string, status: SubmissionStatus): Promise<void> {
    if (this.description) this.description = { ...this.description, status, aiWorkStatus: undefined };
  }

  async requeueSubmission(): Promise<void> {
    this.requeued += 1;
    if (this.description) this.description = { ...this.description, aiWorkStatus: 'queued' };
  }
}

const pending = (text: string, over: Partial<DescriptionDoc> = {}): DescriptionDoc => ({
  submissionId: 'sub-1',
  text,
  files: [],
  status: 'pending',
  ...over,
});

/** An AI client that always throws, to drive the failure paths without touching the network. */
class BrokenAi extends MockAiClient {
  constructor(private readonly error: unknown) {
    super();
  }
  override async callStructured(): Promise<never> {
    throw this.error;
  }
}

beforeEach(() => setAiClient(new MockAiClient()));

describe('processSubmission', () => {
  it('answers an approved submission and marks it accepted', async () => {
    const repo = new QueueRepo();
    repo.description = pending(good);
    setRepository(repo);

    await processSubmission('biz-w', 'fencing');

    expect(repo.reviews).toHaveLength(1);
    const review = repo.reviews[0]!;
    // without displayState the frontend never opens its panel
    expect(review.displayState).toBe('ready');
    expect(review.submissionId).toBe('sub-1');
    expect(review.decision).toBe('approved');
    expect(review.approved).toBe(true);
    expect(repo.description?.status).toBe('accepted');
  });

  it('marks a submission that needs changes as rejected, not failed', async () => {
    const repo = new QueueRepo();
    repo.description = pending(bad);
    setRepository(repo);

    await processSubmission('biz-w', 'fencing');

    expect(repo.reviews[0]?.approved).toBe(false);
    expect(repo.description?.status).toBe('rejected');
  });

  it('does nothing when there is nothing to claim', async () => {
    const repo = new QueueRepo();
    setRepository(repo);
    await processSubmission('biz-w', 'fencing');
    expect(repo.reviews).toHaveLength(0);
  });

  it('will not run the same submission twice while it is in flight', async () => {
    const repo = new QueueRepo();
    repo.description = pending(good, { aiSubmissionId: 'sub-1', aiWorkStatus: 'processing', aiAttempts: 1 });
    setRepository(repo);

    await processSubmission('biz-w', 'fencing');

    expect(repo.reviews).toHaveLength(0);
  });

  it('hands a failed attempt straight back instead of leaving it to go stale', async () => {
    const repo = new QueueRepo();
    repo.description = pending(good);
    setRepository(repo);
    setAiClient(new BrokenAi(new AppError(502, 'model unavailable', 'upstream_unavailable')));

    await processSubmission('biz-w', 'fencing');

    // requeued for the next tick - minutes, not the ten-minute stale window
    expect(repo.requeued).toBe(1);
    expect(repo.description?.aiWorkStatus).toBe('queued');
    expect(repo.description?.status).toBe('pending');
    expect(repo.reviews).toHaveLength(0); // nothing shown to the business yet
  });

  it('gives up on the last attempt and says so plainly', async () => {
    const repo = new QueueRepo();
    repo.description = pending(good, { aiSubmissionId: 'sub-1', aiAttempts: 2 });
    setRepository(repo);
    setAiClient(new BrokenAi(new AppError(502, 'model unavailable', 'upstream_unavailable')));

    await processSubmission('biz-w', 'fencing');

    expect(repo.requeued).toBe(0);
    expect(repo.description?.status).toBe('failed');
    const review = repo.reviews[0]!;
    expect(review.decision).toBe('failed');
    expect(review.displayState).toBe('ready');
    expect(String(review.opening)).toMatch(/nothing you sent has been lost/i);
  });

  it('does not retry something the business has to fix - it answers them', async () => {
    const repo = new QueueRepo();
    repo.description = pending(good);
    setRepository(repo);
    setAiClient(new BrokenAi(new AppError(415, 'We cannot read HEIC photos yet', 'unsupported_file_type')));

    await processSubmission('biz-w', 'fencing');

    expect(repo.requeued).toBe(0);
    expect(repo.description?.status).toBe('rejected');
    expect(String(repo.reviews[0]?.opening)).toMatch(/HEIC/);
  });

  it('reads the previous review without letting it stop a fresh judgement', async () => {
    const repo = new QueueRepo();
    repo.description = pending(good, { submissionId: 'sub-2' });
    repo.previous = {
      displayState: 'ready',
      submissionId: 'sub-1',
      decision: 'needs_updates',
      approved: false,
      status: 'unverified',
      business: { fixes: [{ kind: 'missing', what: 'Say whether your prices include GST.', example: null }] },
    };
    setRepository(repo);

    await processSubmission('biz-w', 'fencing');

    // the good fixture states GST, so last time's fix must not come back
    expect(repo.reviews[0]?.approved).toBe(true);
    expect(repo.description?.status).toBe('accepted');
  });
});
