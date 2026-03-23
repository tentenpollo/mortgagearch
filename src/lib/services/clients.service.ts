import { db } from "@/lib/db";
import { clients } from "@/lib/db/schema";
import { eq, desc, ilike, and, sql, SQL } from "drizzle-orm";

export interface ClientFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export const clientsService = {
  async list(brokerId: string, filters: ClientFilters = {}) {
    const { search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(clients.brokerId, brokerId)];
    if (search) {
      conditions.push(
        sql`(${ilike(clients.name, `%${search}%`)} OR ${ilike(clients.email, `%${search}%`)})`
      );
    }

    const where = and(...conditions);

    const [rows, countResult] = await Promise.all([
      db
        .select()
        .from(clients)
        .where(where)
        .orderBy(desc(clients.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(clients)
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

  async getById(id: string, brokerId: string) {
    const result = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.brokerId, brokerId)))
      .limit(1);
    return result[0] ?? null;
  },

  async create(brokerId: string, data: { name: string; email: string; phone?: string; notes?: string }) {
    const result = await db
      .insert(clients)
      .values({
        brokerId,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        notes: data.notes || null,
      })
      .returning();
    return result[0];
  },

  async update(id: string, brokerId: string, data: Partial<{ name: string; email: string; phone: string; notes: string }>) {
    const result = await db
      .update(clients)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(clients.id, id), eq(clients.brokerId, brokerId)))
      .returning();
    return result[0] ?? null;
  },
};
