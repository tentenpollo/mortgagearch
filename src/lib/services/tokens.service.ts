import { db } from "@/lib/db";
import { uploadTokens, clients } from "@/lib/db/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export const tokensService = {
  async listByClient(clientId: string, brokerId: string) {
    return db
      .select()
      .from(uploadTokens)
      .where(
        and(
          eq(uploadTokens.clientId, clientId),
          eq(uploadTokens.brokerId, brokerId)
        )
      )
      .orderBy(desc(uploadTokens.createdAt));
  },

  async create(data: {
    clientId: string;
    brokerId: string;
    label?: string;
    maxUploads?: number;
    expiresInHours?: number;
  }) {
    const token = crypto.randomBytes(32).toString("hex");
    const defaultExpiryHours = 7 * 24; // 7 days default for compliance
    const expiresAt = data.expiresInHours
      ? new Date(Date.now() + data.expiresInHours * 60 * 60 * 1000)
      : new Date(Date.now() + defaultExpiryHours * 60 * 60 * 1000);

    const result = await db
      .insert(uploadTokens)
      .values({
        token,
        clientId: data.clientId,
        brokerId: data.brokerId,
        label: data.label || null,
        maxUploads: data.maxUploads || null,
        expiresAt,
      })
      .returning();

    return result[0];
  },

  async revoke(id: string, brokerId: string) {
    const result = await db
      .update(uploadTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(uploadTokens.id, id),
          eq(uploadTokens.brokerId, brokerId),
          isNull(uploadTokens.revokedAt)
        )
      )
      .returning();
    return result[0] ?? null;
  },

  async validateToken(token: string) {
    const result = await db
      .select({
        uploadToken: uploadTokens,
        client: clients,
      })
      .from(uploadTokens)
      .innerJoin(clients, eq(uploadTokens.clientId, clients.id))
      .where(eq(uploadTokens.token, token))
      .limit(1);

    const row = result[0];
    if (!row) return { valid: false, reason: "Token not found" } as const;

    const { uploadToken, client } = row;

    if (uploadToken.revokedAt) {
      return { valid: false, reason: "This upload link has been revoked" } as const;
    }
    if (uploadToken.expiresAt && new Date() > uploadToken.expiresAt) {
      return { valid: false, reason: "This upload link has expired" } as const;
    }
    if (uploadToken.maxUploads && uploadToken.uploadCount >= uploadToken.maxUploads) {
      return { valid: false, reason: "Upload limit reached" } as const;
    }

    return { valid: true, uploadToken, client } as const;
  },

  async incrementUploadCount(tokenId: string) {
    await db
      .update(uploadTokens)
      .set({
        uploadCount: sql`${uploadTokens.uploadCount} + 1`,
      })
      .where(eq(uploadTokens.id, tokenId));
  },
};
