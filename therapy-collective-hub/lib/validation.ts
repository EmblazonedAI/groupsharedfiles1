import { z } from 'zod';

const urlField = z
  .string()
  .trim()
  .max(2048, 'Link is too long')
  .refine((v) => v === '' || v.startsWith('http://') || v.startsWith('https://'), {
    message: 'Link must start with http:// or https://',
  });

export const resourceInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(255, 'Title must be under 255 characters'),
  url: urlField.nullish(),
  blobUrl: z.string().trim().max(2048).nullish(),
  ogImage: z.string().trim().max(2048).nullish(),
  description: z.string().trim().max(5000, 'Description must be under 5,000 characters').nullish(),
  tags: z.array(z.string().trim().min(1).max(50, 'Each tag must be under 50 characters')).max(20, 'Maximum 20 tags').optional(),
  category: z.string().trim().min(1, 'Category is required').max(100),
  format: z.string().trim().min(1, 'Format is required').max(100),
  addedBy: z.string().trim().max(100).nullish(),
  notes: z.string().trim().max(5000, 'Notes must be under 5,000 characters').nullish(),
});

export const resourceUpdateSchema = resourceInputSchema.partial();

export const commentInputSchema = z.object({
  text: z.string().trim().min(1, 'Comment cannot be empty').max(2000, 'Comment must be under 2,000 characters'),
  name: z.string().trim().max(100).nullish(),
});

export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, 'Category name is required')
  .max(100, 'Category name must be under 100 characters');

/** First human-readable message from a failed parse. */
export const firstIssue = (error: z.ZodError) =>
  error.issues[0]?.message || 'Invalid input';
