import { db } from "@/lib/db";
import { documents, clients, uploadTokens } from "@/lib/db/schema";
import { eq, desc, and, sql, SQL, ilike } from "drizzle-orm";
import type { DocumentStatus } from "@/lib/types";

export interface DocumentFilters {
  status?: DocumentStatus;
  clientId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const documentsService = {
  async list(brokerId: string, filters: DocumentFilters = {}) {
    const { status, clientId, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(clients.brokerId, brokerId)];
    if (status) conditions.push(eq(documents.status, status));
    if (clientId) conditions.push(eq(documents.clientId, clientId));
    if (search) {
      conditions.push(
        sql`(${ilike(documents.originalFilename, `%${search}%`)} OR ${ilike(clients.name, `%${search}%`)})`
      );
    }

    const where = and(...conditions);

    const [rows, countResult] = await Promise.all([
      db
        .select({
          document: documents,
          client: clients,
        })
        .from(documents)
        .innerJoin(clients, eq(documents.clientId, clients.id))
        .where(where)
        .orderBy(desc(documents.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(documents)
        .innerJoin(clients, eq(documents.clientId, clients.id))
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

  async getById(id: string) {
    const result = await db
      .select({
        document: documents,
        client: clients,
      })
      .from(documents)
      .innerJoin(clients, eq(documents.clientId, clients.id))
      .where(eq(documents.id, id))
      .limit(1);
    return result[0] ?? null;
  },

  async createFromUpload(data: {
    clientId: string;
    uploadTokenId: string;
    originalFilename: string;
    mimeType: string;
    fileSizeBytes: number;
    storedUrl: string;
  }) {
    const result = await db
      .insert(documents)
      .values({
        clientId: data.clientId,
        uploadTokenId: data.uploadTokenId,
        originalFilename: data.originalFilename,
        mimeType: data.mimeType,
        fileSizeBytes: data.fileSizeBytes,
        storedUrl: data.storedUrl,
        status: "UPLOADED",
      })
      .returning();
    return result[0];
  },

  async approve(id: string, reviewedBy: string, notes?: string) {
    const result = await db
      .update(documents)
      .set({
        status: "APPROVED",
        reviewDecision: "APPROVED",
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: notes || null,
        updatedAt: new Date(),
      })
      .where(
        and(eq(documents.id, id), eq(documents.status, "PENDING_REVIEW"))
      )
      .returning();
    return result[0] ?? null;
  },

  async reject(id: string, reviewedBy: string, reason: string) {
    const result = await db
      .update(documents)
      .set({
        status: "REJECTED",
        reviewDecision: "REJECTED",
        reviewedBy,
        reviewedAt: new Date(),
        reviewNotes: reason,
        updatedAt: new Date(),
      })
      .where(
        and(eq(documents.id, id), eq(documents.status, "PENDING_REVIEW"))
      )
      .returning();
    return result[0] ?? null;
  },

  async updateStatus(id: string, status: DocumentStatus, reason?: string) {
    const result = await db
      .update(documents)
      .set({
        status,
        statusReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();
    return result[0] ?? null;
  },

  async countByStatus(brokerId: string) {
    const rows = await db
      .select({
        status: documents.status,
        count: sql<number>`count(*)::int`,
      })
      .from(documents)
      .innerJoin(clients, eq(documents.clientId, clients.id))
      .where(eq(clients.brokerId, brokerId))
      .groupBy(documents.status);

    const counts: Record<string, number> = {};
    rows.forEach((r) => (counts[r.status] = r.count));
    return counts;
  },
};
