import {
  pgTable,
  index,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  bigint,
  real,
  inet,
} from "drizzle-orm/pg-core";

// ============================================================
// Clients
// ============================================================

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    phone: varchar("phone", { length: 30 }),
    folderPath: varchar("folder_path", { length: 500 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    createdAtIdx: index("clients_created_at_idx").on(table.createdAt),
  })
);

// ============================================================
// Upload Tokens
// ============================================================

export const uploadTokens = pgTable(
  "upload_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    clientId: uuid("client_id")
      .references(() => clients.id)
      .notNull(),
    reason: varchar("reason", { length: 500 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxUploads: integer("max_uploads"),
    uploadCount: integer("upload_count").default(0).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clientIdIdx: index("upload_tokens_client_id_idx").on(table.clientId),
    clientIdCreatedAtIdx: index("upload_tokens_client_id_created_at_idx").on(table.clientId, table.createdAt),
  })
);

// ============================================================
// Documents
// ============================================================

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .references(() => clients.id)
      .notNull(),
    uploadTokenId: uuid("upload_token_id").references(() => uploadTokens.id),

  // File info
  originalFilename: varchar("original_filename", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
  sha256: varchar("sha256", { length: 64 }),
  storedPath: varchar("stored_path", { length: 1000 }).notNull(),

  // Pipeline state
  status: varchar("status", { length: 30 }).notNull().default("UPLOADED"),
  statusReason: text("status_reason"),
  ocrAttempts: integer("ocr_attempts").default(0).notNull(),
  aiAttempts: integer("ai_attempts").default(0).notNull(),

  // OCR results
  ocrTextPath: varchar("ocr_text_path", { length: 1000 }),
  ocrConfidence: real("ocr_confidence"),
  ocrMetadata: jsonb("ocr_metadata"),
  ocrCompletedAt: timestamp("ocr_completed_at", { withTimezone: true }),

  // AI results
  aiProvider: varchar("ai_provider", { length: 30 }),
  aiModel: varchar("ai_model", { length: 50 }),
  aiResult: jsonb("ai_result"), // normalized AiResult shape
  aiRawResponse: jsonb("ai_raw_response"),
  aiCompletedAt: timestamp("ai_completed_at", { withTimezone: true }),

  // Broker review
  reviewedBy: varchar("reviewed_by", { length: 100 }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewDecision: varchar("review_decision", { length: 20 }),
  reviewNotes: text("review_notes"),
  brokerCorrections: jsonb("broker_corrections"),

  // Filing
  finalFilename: varchar("final_filename", { length: 500 }),
  finalPath: varchar("final_path", { length: 1000 }),
  filedAt: timestamp("filed_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uploadTokenIdIdx: index("documents_upload_token_id_idx").on(table.uploadTokenId),
  })
);

// ============================================================
// Audit Logs (append-only — no updated_at column)
// ============================================================

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => documents.id),
  clientId: uuid("client_id").references(() => clients.id),
  actorType: varchar("actor_type", { length: 20 }).notNull(), // SYSTEM | BROKER | CLIENT | AI
  actorId: varchar("actor_id", { length: 100 }),
  action: varchar("action", { length: 50 }).notNull(),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  // NO updated_at — audit logs are immutable
});
