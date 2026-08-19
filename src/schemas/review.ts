import { z } from 'zod';

/** Agent 1's output. The model supplies the words; code owns the layout (src/report). */
export const reviewSchema = z.object({
  approved: z.boolean(),
  opening: z.string(),
  whyUpdatesNeeded: z.string(),
  fixes: z
    .object({
      what: z.string(),
      example: z.string().nullable(),
    })
    .array(),
  closing: z.string(),
});

export type ReviewResult = z.infer<typeof reviewSchema>;
