import { z } from "zod";

// ── Client ─────────────────────────────────────────────────
export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Valid email required"),
  phone: z.string().max(30).optional().or(z.literal("")),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const updateClientSchema = createClientSchema.partial();

// ── Upload Token ───────────────────────────────────────────
export const createTokenSchema = z.object({
  clientId: z.string().uuid("Valid client ID required"),
  label: z.string().min(1, "Label is required").max(500),
  maxUploads: z.coerce.number().int().positive().optional(),
  expiresInHours: z.coerce.number().positive().optional(),
});

// ── Document Review ────────────────────────────────────────
export const approveDocumentSchema = z.object({
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export const rejectDocumentSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required").max(2000),
});

// ── Auth ───────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
