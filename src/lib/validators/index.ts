import { z } from "zod";
import { DOCUMENT_TYPES } from "@/lib/types";

// ============================================================
// Upload
// ============================================================

export const uploadFileSchema = z.object({
  file: z.instanceof(File, { message: "File is required" }),
});

// ============================================================
// Approve / Reject
// ============================================================

export const approveDocumentSchema = z.object({
  corrections: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  notes: z.string().optional(),
});

export const rejectDocumentSchema = z.object({
  reason: z.string().min(1, "Rejection reason is required"),
});

// ============================================================
// Client Management
// ============================================================

export const createClientSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Valid email required"),
  phone: z.string().max(30).optional(),
});

// ============================================================
// Token Generation
// ============================================================

export const createTokenSchema = z.object({
  clientId: z.string().uuid("Valid client ID required"),
  reason: z.string().min(1, "Reason is required").max(500),
  maxUploads: z.number().int().positive().optional(),
  expiresInHours: z.number().positive().optional(),
});

// ============================================================
// AI Result Validation (validates mock/real provider output)
// ============================================================

export const aiResultSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  confidence: z.number().min(0).max(1),
  extractedFields: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  validation: z.object({
    isValid: z.boolean(),
    issues: z.array(
      z.object({
        field: z.string(),
        severity: z.enum(["ERROR", "WARNING", "INFO"]),
        message: z.string(),
      })
    ),
  }),
  reasoning: z.string(),
});
