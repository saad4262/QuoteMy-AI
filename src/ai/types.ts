import type { z } from 'zod';

export interface ModelCall<T> {
  /** Schema name sent to OpenAI, and the label this call appears under in `meta.stages`. */
  name: string;
  schema: z.ZodType<T>;
  system: string;
  user: string;
  maxOutputTokens: number;
  timeoutMs?: number;
}

export interface StageUsage {
  name: string;
  ms: number;
  tokensIn: number;
  tokensOut: number;
  retries: number;
  costUsd: number;
}

export interface ModelResult<T> {
  data: T;
  usage: StageUsage;
}

export interface AiClient {
  readonly model: string;
  callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>>;
}
