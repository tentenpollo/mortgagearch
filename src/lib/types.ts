// ──────────────────────────────────────────────────────────────
// Document Statuses
// ──────────────────────────────────────────────────────────────

export const DOCUMENT_STATUSES = [
  "UPLOADED",
  "PROCESSING",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const VALID_TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  UPLOADED: ["PROCESSING"],
  PROCESSING: ["PENDING_REVIEW", "UPLOADED"], // can retry
  PENDING_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: [],   // terminal
  REJECTED: [],   // terminal
};

export function isValidTransition(from: DocumentStatus, to: DocumentStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ──────────────────────────────────────────────────────────────
// Audit Actions
// ──────────────────────────────────────────────────────────────

export const AUDIT_ACTIONS = [
  "CLIENT_CREATED",
  "CLIENT_UPDATED",
  "TOKEN_CREATED",
  "TOKEN_REVOKED",
  "DOCUMENT_UPLOADED",
  "DOCUMENT_PROCESSING",
  "DOCUMENT_READY_FOR_REVIEW",
  "DOCUMENT_APPROVED",
  "DOCUMENT_REJECTED",
  "BROKER_LOGIN",
  "BROKER_LOGOUT",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type ActorType = "SYSTEM" | "BROKER" | "BORROWER";

// ──────────────────────────────────────────────────────────────
// Status Labels & Colors (for UI)
// ──────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; color: "gray" | "blue" | "yellow" | "green" | "red" }
> = {
  UPLOADED: { label: "Uploaded", color: "gray" },
  PROCESSING: { label: "Processing", color: "blue" },
  PENDING_REVIEW: { label: "Pending Review", color: "yellow" },
  APPROVED: { label: "Approved", color: "green" },
  REJECTED: { label: "Rejected", color: "red" },
};

// ──────────────────────────────────────────────────────────────
// API Response
// ──────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
