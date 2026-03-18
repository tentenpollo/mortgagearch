import { NextRequest, NextResponse } from "next/server";
import { requireBrokerAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadTokens } from "@/lib/db/schema";
import { createTokenSchema } from "@/lib/validators";
import { auditService } from "@/lib/services/audit.service";
import { clearServerCacheByPrefix } from "@/lib/server-cache";
import type { ApiResponse } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const TOKENS_CACHE_PREFIX = "broker:tokens:";
const CLIENTS_CACHE_PREFIX = "broker:clients:";

export async function POST(request: NextRequest) {
  const authError = await requireBrokerAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = createTokenSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: parsed.error.errors.map((e) => e.message).join(", "),
          },
        },
        { status: 400 }
      );
    }

    const token = uuidv4().replace(/-/g, "").slice(0, 32);

    let expiresAt: Date | null = null;
    if (parsed.data.expiresInHours) {
      expiresAt = new Date(Date.now() + parsed.data.expiresInHours * 60 * 60 * 1000);
    }

    const [row] = await db
      .insert(uploadTokens)
      .values({
        token,
        clientId: parsed.data.clientId,
        reason: parsed.data.reason,
        maxUploads: parsed.data.maxUploads ?? null,
        expiresAt,
      })
      .returning();

    await auditService.log({
      actorType: "BROKER",
      actorId: "broker",
      action: "TOKEN_CREATED",
      clientId: parsed.data.clientId,
      details: {
        tokenId: row.id,
        reason: parsed.data.reason,
        maxUploads: parsed.data.maxUploads,
        expiresInHours: parsed.data.expiresInHours,
      },
    });

    clearServerCacheByPrefix(TOKENS_CACHE_PREFIX);
    clearServerCacheByPrefix(CLIENTS_CACHE_PREFIX);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          id: row.id,
          token: row.token,
          reason: row.reason,
          uploadUrl: `${appUrl}/upload/${row.token}`,
          expiresAt: row.expiresAt,
          maxUploads: row.maxUploads,
          createdAt: row.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create token error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create token" } },
      { status: 500 }
    );
  }
}
