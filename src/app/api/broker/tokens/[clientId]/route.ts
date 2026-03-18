import { NextRequest, NextResponse } from "next/server";
import { requireBrokerAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadTokens, documents, auditLogs } from "@/lib/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { storageService } from "@/lib/services/storage.service";
import { auditService } from "@/lib/services/audit.service";
import { clearServerCacheByPrefix, getServerCache, setServerCache } from "@/lib/server-cache";
import type { ApiResponse } from "@/lib/types";

const TOKENS_CACHE_PREFIX = "broker:tokens:";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const authError = requireBrokerAuth(request);
  if (authError) return authError;

  try {
    const { clientId } = await params;

    const cacheKey = `${TOKENS_CACHE_PREFIX}${clientId}`;
    const cached = getServerCache<unknown[]>(cacheKey);

    if (cached) {
      return NextResponse.json<ApiResponse>({
        success: true,
        data: cached,
      });
    }

    const tokens = await db
      .select({
        id: uploadTokens.id,
        token: uploadTokens.token,
        reason: uploadTokens.reason,
        maxUploads: uploadTokens.maxUploads,
        uploadCount: uploadTokens.uploadCount,
        expiresAt: uploadTokens.expiresAt,
        revokedAt: uploadTokens.revokedAt,
        createdAt: uploadTokens.createdAt,
      })
      .from(uploadTokens)
      .where(eq(uploadTokens.clientId, clientId))
      .orderBy(desc(uploadTokens.createdAt));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    const tokensWithStatus = tokens.map((token) => {
      const uploaded = token.uploadCount > 0;

      return {
        ...token,
        uploadUrl: `${appUrl}/upload/${token.token}`,
        uploaded,
        uploadCount: token.uploadCount,
      };
    });

    setServerCache(cacheKey, tokensWithStatus, 15_000);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: tokensWithStatus,
    });
  } catch (error) {
    console.error("List tokens error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to list tokens" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const authError = requireBrokerAuth(request);
  if (authError) return authError;

  try {
    const { clientId } = await params;
    const url = new URL(request.url);
    const tokenId = url.searchParams.get("tokenId");

    if (!tokenId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: { code: "VALIDATION_ERROR", message: "tokenId is required" } },
        { status: 400 }
      );
    }

    const [tokenRow] = await db
      .select({
        id: uploadTokens.id,
        clientId: uploadTokens.clientId,
        token: uploadTokens.token,
      })
      .from(uploadTokens)
      .where(and(eq(uploadTokens.id, tokenId), eq(uploadTokens.clientId, clientId)))
      .limit(1);

    if (!tokenRow) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: { code: "NOT_FOUND", message: "Upload link not found" } },
        { status: 404 }
      );
    }

    const linkedDocs = await db
      .select({
        id: documents.id,
        storedPath: documents.storedPath,
      })
      .from(documents)
      .where(eq(documents.uploadTokenId, tokenId));

    await Promise.all(
      linkedDocs
        .filter((doc) => Boolean(doc.storedPath))
        .map(async (doc) => {
          try {
            await storageService.remove(doc.storedPath);
          } catch (error) {
            console.warn(`Failed to delete blob for document ${doc.id}:`, error);
          }
        })
    );

    const documentIds = linkedDocs.map((doc) => doc.id);

    if (documentIds.length > 0) {
      await db.delete(auditLogs).where(inArray(auditLogs.documentId, documentIds));
    }

    await db.delete(documents).where(eq(documents.uploadTokenId, tokenId));
    await db.delete(uploadTokens).where(eq(uploadTokens.id, tokenId));

    clearServerCacheByPrefix(TOKENS_CACHE_PREFIX);
    clearServerCacheByPrefix("broker:clients:");

    await auditService.log({
      actorType: "BROKER",
      actorId: "broker",
      action: "TOKEN_DELETED",
      clientId: tokenRow.clientId,
      details: {
        tokenId: tokenRow.id,
        token: tokenRow.token,
        deletedDocumentCount: linkedDocs.length,
      },
    });

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        tokenId,
        deletedDocumentCount: linkedDocs.length,
      },
    });
  } catch (error) {
    console.error("Delete token error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete upload link" } },
      { status: 500 }
    );
  }
}
