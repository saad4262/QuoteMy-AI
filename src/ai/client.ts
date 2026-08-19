import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';
import { costUsd } from './pricing.js';
import { toStrictJsonSchema } from '../schemas/toJsonSchema.js';
import type { AiClient, ModelCall, ModelResult } from './types.js';

/**
 * The single chokepoint. Nothing else in this codebase imports the OpenAI SDK — one file to audit
 * for key handling, one place that counts tokens, one place that retries.
 */
class OpenAiClient implements AiClient {
  readonly model: string;
  private readonly sdk: OpenAI;

  constructor(apiKey: string, model: string) {
    this.model = model;
    this.sdk = new OpenAI({ apiKey, maxRetries: 0 }); // retries are ours, below, and counted
  }

  async callStructured<T>(call: ModelCall<T>): Promise<ModelResult<T>> {
    const started = Date.now();
    let tokensIn = 0;
    let tokensOut = 0;
    let retries = 0;
    let feedback = '';

    // Attempt 1 is the call. Attempt 2 is the ONE retry with the validation error fed back.
    // Two failures means the prompt is wrong — flag it, do not loop (CONTEXT.md §7.7).
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const raw = await this.request(call, feedback);
      tokensIn += raw.tokensIn;
      tokensOut += raw.tokensOut;

      const parsed = this.parse(call.schema, raw.text);
      if (parsed.ok) {
        const usage = {
          name: call.name,
          ms: Date.now() - started,
          tokensIn,
          tokensOut,
          retries,
          costUsd: costUsd(this.model, tokensIn, tokensOut),
        };
        logger.info({ stage: call.name, ...usage }, 'model call');
        return { data: parsed.value, usage };
      }

      retries += 1;
      feedback = [
        '',
        'Your previous reply could not be used. It failed validation with:',
        parsed.error,
        'Return the same content again, corrected, matching the schema exactly.',
      ].join('\n');
      logger.warn({ stage: call.name, attempt, error: parsed.error }, 'model output failed validation');
    }

    throw new AppError(502, 'The model returned output we could not use', 'schema_violation');
  }

  private async request(call: ModelCall<unknown>, feedback: string) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), call.timeoutMs ?? env.MODEL_TIMEOUT_MS);

    try {
      const response = await this.sdk.responses.create(
        {
          model: this.model,
          instructions: call.system + feedback,
          input: call.user,
          max_output_tokens: call.maxOutputTokens,
          text: {
            format: {
              type: 'json_schema',
              name: call.name,
              strict: true,
              schema: toStrictJsonSchema(call.schema as z.ZodType),
            },
          },
        },
        { signal: controller.signal },
      );

      return {
        text: response.output_text ?? '',
        tokensIn: response.usage?.input_tokens ?? 0,
        tokensOut: response.usage?.output_tokens ?? 0,
      };
    } catch (err) {
      throw toUpstreamError(err);
    } finally {
      clearTimeout(timer);
    }
  }

  private parse<T>(schema: z.ZodType<T>, text: string) {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return { ok: false as const, error: 'the reply was not valid JSON' };
    }
    const result = schema.safeParse(json);
    return result.success
      ? { ok: true as const, value: result.data }
      : { ok: false as const, error: JSON.stringify(z.treeifyError(result.error)) };
  }
}

function toUpstreamError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  const name = (err as { name?: string })?.name;
  if (name === 'AbortError' || name === 'TimeoutError') {
    return new AppError(504, 'The model did not respond in time', 'upstream_timeout');
  }

  const status = (err as { status?: number })?.status;
  if (status === 429) return new AppError(429, 'The model is rate limiting us, try again shortly', 'rate_limited');

  // Never surface the provider's message verbatim — it can echo prompt content back to the caller.
  logger.error({ err }, 'model call failed');
  return new AppError(502, 'The model service is unavailable', 'upstream_unavailable');
}

let instance: AiClient | null = null;

/** Built lazily so tests, typecheck and the mock provider never need a key. */
export async function getAiClient(): Promise<AiClient> {
  if (instance) return instance;

  if (env.AI_PROVIDER === 'mock') {
    const { MockAiClient } = await import('./mock.js');
    instance = new MockAiClient();
    return instance;
  }

  if (!env.OPENAI_API_KEY) {
    throw new AppError(500, 'OPENAI_API_KEY is not configured', 'internal_error');
  }
  instance = new OpenAiClient(env.OPENAI_API_KEY, env.OPENAI_MODEL);
  return instance;
}

/** Tests inject their own; nothing else should call this. */
export function setAiClient(client: AiClient | null): void {
  instance = client;
}
