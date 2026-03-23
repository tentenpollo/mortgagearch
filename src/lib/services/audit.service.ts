import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { desc, and, eq, sql, SQL } from "drizzle-orm";
import type { AuditAction, ActorType } from "@/lib/types";

interface AuditEntry {
  brokerId?: string;
  clientId?: string;
  documentId?: string;
  actorType: ActorType;
  actorId?: string;
  action: AuditAction;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export interface AuditFilters {
  action?: string;
  clientId?: string;
  documentId?: string;
  page?: number;
  limit?: number;
}

export const auditService = {
  async log(entry: AuditEntry) {
    await db.insert(auditLogs).values({
      brokerId: entry.brokerId || null,
      clientId: entry.clientId || null,
      documentId: entry.documentId || null,
      actorType: entry.actorType,
      actorId: entry.actorId || null,
      action: entry.action,
      details: entry.details as object || null,
      ipAddress: entry.ipAddress || null,
    });
  },

  async list(brokerId: string, filters: AuditFilters = {}) {
    const { action, clientId, documentId, page = 1, limit = 50 } = filters;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(auditLogs.brokerId, brokerId)];
    if (action) conditions.push(eq(auditLogs.action, action));
    if (clientId) conditions.push(eq(auditLogs.clientId, clientId));
    if (documentId) conditions.push(eq(auditLogs.documentId, documentId));

    const where = and(...conditions);

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .where(where)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs)
        .where(where),
    ]);

    return {
      items: rows,
      total: countResult[0]?.count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit),
    };
  },
};
