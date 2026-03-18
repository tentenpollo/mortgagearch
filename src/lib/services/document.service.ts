import { db } from "@/lib/db";
import { documents } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export const documentService = {
  async list() {
    return await db
      .select()
      .from(documents)
      .orderBy(desc(documents.createdAt));
  },

  async getById(id: string) {
    const result = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return result[0];
  },

  async update(id: string, data: Record<string, unknown>) {
    await db
      .update(documents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(documents.id, id));
  },
};
