import { z } from "zod";

// Trimmed, non-empty text with an upper bound.
export const text = (max: number) => z.string().trim().min(1).max(max);

// A field the client may leave out (keep or default) or send as null (clear).
export const clearable = <T extends z.ZodTypeAny>(schema: T) => schema.nullable().optional();

// Calendar date without time, e.g. "2026-03-14".
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Invalid date");

// ISO 8601 timestamp, as produced by Date.prototype.toISOString().
export const timestampSchema = z.string().datetime();

export const idSchema = z.string().min(1).max(64);

// Id a client generates for a new record, so a retried create never duplicates it.
export const clientIdSchema = z.string().uuid();
