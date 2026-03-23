import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  bigint,
  index,
} from "drizzle-orm/pg-core";

// ──────────────────────────────────────────────────────────────
// Broker Profiles (linked to Supabase auth.users)
// ──────────────────────────────────────────────────────────────

export const brokerProfiles = pgTable("broker_profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  fullName: varchar("full_name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ──────────────────────────────────────────────────────────────
// Clients (borrowers managed by brokers)
// ──────────────────────────────────────────────────────────────

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brokerId: uuid("broker_id")
      .references(() => brokerProfiles.id)
      .notNull(),
    name: varchar("name", { length: 200 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    brokerIdIdx: index("clients_broker_id_idx").on(table.brokerId),
    createdAtIdx: index("clients_created_at_idx").on(table.createdAt),
  })
);

// ──────────────────────────────────────────────────────────────
// Upload Tokens (secure links for borrower uploads)
// ──────────────────────────────────────────────────────────────

export const uploadTokens = pgTable(
  "upload_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    clientId: uuid("client_id")
      .references(() => clients.id)
      .notNull(),
    brokerId: uuid("broker_id")
      .references(() => brokerProfiles.id)
      .notNull(),
    label: varchar("label", { length: 500 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    maxUploads: integer("max_uploads"),
    uploadCount: integer("upload_count").default(0).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clientIdIdx: index("upload_tokens_client_id_idx").on(table.clientId),
    tokenIdx: index("upload_tokens_token_idx").on(table.token),
  })
);

// ──────────────────────────────────────────────────────────────
// Documents
// ──────────────────────────────────────────────────────────────

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .references(() => clients.id)
      .notNull(),
    uploadTokenId: uuid("upload_token_id").references(() => uploadTokens.id),
    originalFilename: varchar("original_filename", { length: 500 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
    storedUrl: varchar("stored_url", { length: 1000 }).notNull(),
    // Pipeline status
    status: varchar("status", { length: 30 }).notNull().default("UPLOADED"),
    statusReason: text("status_reason"),
    // Broker review
    reviewedBy: uuid("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewDecision: varchar("review_decision", { length: 20 }),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clientIdIdx: index("documents_client_id_idx").on(table.clientId),
    statusIdx: index("documents_status_idx").on(table.status),
    uploadTokenIdIdx: index("documents_upload_token_id_idx").on(table.uploadTokenId),
  })
);

// ──────────────────────────────────────────────────────────────
// Audit Logs (append-only, immutable)
// ──────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brokerId: uuid("broker_id"),
    clientId: uuid("client_id"),
    documentId: uuid("document_id"),
    actorType: varchar("actor_type", { length: 20 }).notNull(), // SYSTEM | BROKER | BORROWER
    actorId: varchar("actor_id", { length: 100 }),
    action: varchar("action", { length: 50 }).notNull(),
    details: jsonb("details"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    brokerIdIdx: index("audit_logs_broker_id_idx").on(table.brokerId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
  })
);
