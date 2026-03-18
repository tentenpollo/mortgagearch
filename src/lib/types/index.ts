// ============================================================
// Document Status — strict state machine
// ============================================================

export const DOCUMENT_STATUSES = [
  "UPLOADED",
  "OCR_PENDING",
  "OCR_RUNNING",
  "OCR_DONE",
  "OCR_FAILED",
  "AI_PENDING",
  "AI_RUNNING",
  "AI_DONE",
  "AI_FAILED",
  "PENDING_REVIEW",
  "APPROVED",
  "FILED",
  "REJECTED",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

/** Valid state transitions — the source of truth for the pipeline state machine. */
export const VALID_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  UPLOADED: ["OCR_PENDING"],
  OCR_PENDING: ["OCR_RUNNING"],
  OCR_RUNNING: ["OCR_DONE", "OCR_FAILED"],
  OCR_DONE: ["AI_PENDING"],
  OCR_FAILED: ["OCR_PENDING"], // allow retry
  AI_PENDING: ["AI_RUNNING"],
  AI_RUNNING: ["AI_DONE", "AI_FAILED"],
  AI_DONE: ["PENDING_REVIEW"],
  AI_FAILED: ["AI_PENDING"], // allow retry
  PENDING_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["FILED"],
  FILED: [], // terminal
  REJECTED: [], // terminal (client re-uploads as new doc)
};

export function isValidTransition(from: DocumentStatus, to: DocumentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ============================================================
// Document Types
// ============================================================

export const DOCUMENT_TYPES = [
  "GOVERNMENT_ID",
  "PAY_STUB",
  "BANK_STATEMENT",
  "EMPLOYMENT_LETTER",
  "OTHER",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

// ============================================================
// OCR Result
// ============================================================

export interface OcrResult {
  text: string;
  confidence: number; // 0.0–1.0
  pageCount: number;
  processingTimeMs: number;
}

// ============================================================
// AI Result (normalized output from any AI provider)
// ============================================================

export interface AiResult {
  documentType: DocumentType;
  confidence: number;
  extractedFields: Record<string, string | number | boolean | null>;
  validation: {
    isValid: boolean;
    issues: AiValidationIssue[];
  };
  reasoning: string;
}

export interface AiValidationIssue {
  field: string;
  severity: "ERROR" | "WARNING" | "INFO";
  message: string;
}

// ============================================================
// Audit Actions
// ============================================================

export const AUDIT_ACTIONS = [
  "DOCUMENT_UPLOADED",
  "OCR_STARTED",
  "OCR_COMPLETED",
  "OCR_FAILED",
  "AI_STARTED",
  "AI_COMPLETED",
  "AI_FAILED",
  "REVIEW_OPENED",
  "BROKER_APPROVED",
  "BROKER_REJECTED",
  "BROKER_CORRECTED_FIELDS",
  "FILE_RENAMED_AND_FILED",
  "CLIENT_CREATED",
  "TOKEN_CREATED",
  "TOKEN_DELETED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type ActorType = "SYSTEM" | "BROKER" | "CLIENT" | "AI";

// ============================================================
// API Response
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
