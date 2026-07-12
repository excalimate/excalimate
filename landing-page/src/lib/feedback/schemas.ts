import { z } from 'zod';
import { FEEDBACK_CATEGORY_IDS, FEEDBACK_STATUS_IDS } from './config';

const displayName = z
  .string()
  .trim()
  .max(60)
  .transform((value) => value || 'Anonymous');
const turnstileToken = z.string().min(1).max(2048);

export const createFeedbackSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(5000),
  displayName,
  category: z.enum(FEEDBACK_CATEGORY_IDS),
  turnstileToken,
});

export const createCommentSchema = z.object({
  body: z.string().trim().min(2).max(2000),
  displayName,
  turnstileToken,
});

export const voteSchema = z.object({
  turnstileToken,
});

export const listFeedbackSchema = z.object({
  search: z.string().trim().max(100).default(''),
  category: z.enum(['all', ...FEEDBACK_CATEGORY_IDS]).default('all'),
  status: z.enum(['all', ...FEEDBACK_STATUS_IDS]).default('all'),
  sort: z.enum(['top', 'newest']).default('top'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type ListFeedbackInput = z.infer<typeof listFeedbackSchema>;
