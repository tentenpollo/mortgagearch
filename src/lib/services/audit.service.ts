import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type AuditLogInput = {
  actorType: "SYSTEM" | "BROKER" | "CLIENT" | "AI";
  actorId?: string;
  action: string;
  documentId?: string;
  clientId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

export const auditService = {
  async log(input: AuditLogInput) {
    await db.insert(auditLogs).values({
      actorType: input.actorType,
      actorId: input.actorId,
      action: input.action,
      documentId: input.documentId,
      clientId: input.clientId,
      details: input.details as object,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    });
  },

  async getByDocumentId(documentId: string) {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.documentId, documentId));
  },
};
