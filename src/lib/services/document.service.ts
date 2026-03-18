import { db } from "@/lib/db";
import { clients, documents } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export const documentService = {
  async list() {
    return await db
      .select({
        document: documents,
        client: clients,
      })
      .from(documents)
      .innerJoin(clients, eq(documents.clientId, clients.id))
      .orderBy(desc(documents.createdAt));
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

  async update(id: string, data: Record<string, unknown>) {
    const result = await db
      .update(documents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();

    return result[0] ?? null;
  },
};
