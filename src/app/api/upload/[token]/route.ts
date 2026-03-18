import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { uploadTokens, documents, clients } from "@/lib/db/schema";
import { eq, and, isNull, or, gt } from "drizzle-orm";
import { storageService } from "@/lib/services/storage.service";
import { auditService } from "@/lib/services/audit.service";
import { clearServerCacheByPrefix, getServerCache, setServerCache } from "@/lib/server-cache";
import type { ApiResponse } from "@/lib/types";

const TOKEN_CONTEXT_CACHE_PREFIX = "upload:token-context:";

type UploadTokenContext = {
  clientName: string | null;
  reason: string | null;
  expiresAt: Date | null;
};

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const cacheKey = `${TOKEN_CONTEXT_CACHE_PREFIX}${token}`;
    const cached = getServerCache<UploadTokenContext>(cacheKey);

    if (cached) {
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: cached,
        },
        {
          headers: {
            "Cache-Control": "private, max-age=0, must-revalidate",
          },
        }
      );
    }

    const [tokenRow] = await db
      .select({
        reason: uploadTokens.reason,
        expiresAt: uploadTokens.expiresAt,
        clientName: clients.name,
      })
      .from(uploadTokens)
      .leftJoin(clients, eq(uploadTokens.clientId, clients.id))
      .where(
        and(
          eq(uploadTokens.token, token),
          isNull(uploadTokens.revokedAt),
          or(isNull(uploadTokens.expiresAt), gt(uploadTokens.expiresAt, new Date()))
        )
      )
      .limit(1);

    if (!tokenRow) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: { code: "INVALID_TOKEN", message: "Upload token is invalid, expired, or revoked" } },
        { status: 403 }
      );
    }

    const payload: UploadTokenContext = {
      clientName: tokenRow.clientName,
      reason: tokenRow.reason,
      expiresAt: tokenRow.expiresAt,
    };

    setServerCache(cacheKey, payload, 30_000);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: payload,
    }, {
      headers: {
        "Cache-Control": "private, max-age=0, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Get upload context error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to load upload details" } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    // 1. Validate the upload token
    const [tokenRow] = await db
      .select()
      .from(uploadTokens)
      .leftJoin(clients, eq(uploadTokens.clientId, clients.id))
      .where(
        and(
          eq(uploadTokens.token, token),
          isNull(uploadTokens.revokedAt),
          or(
            isNull(uploadTokens.expiresAt),
            gt(uploadTokens.expiresAt, new Date())
          )
        )
      )
      .limit(1);

    if (!tokenRow) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: { code: "INVALID_TOKEN", message: "Upload token is invalid, expired, or revoked" } },
        { status: 403 }
      );
    }

    // Check upload count limit
    if (
      tokenRow.upload_tokens.maxUploads !== null &&
      tokenRow.upload_tokens.uploadCount >= tokenRow.upload_tokens.maxUploads
    ) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: { code: "UPLOAD_LIMIT", message: "Maximum upload count reached for this token" } },
        { status: 403 }
      );
    }

    // 2. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: { code: "NO_FILE", message: "No file provided" } },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/tiff",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: { code: "INVALID_TYPE", message: `File type ${file.type} not allowed. Accepted: PDF, JPEG, PNG, WebP, TIFF` } },
        { status: 400 }
      );
    }

    // Max 20MB
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: { code: "FILE_TOO_LARGE", message: "File size exceeds 20MB limit" } },
        { status: 400 }
      );
    }

    // 3. Upload to Vercel Blob
    const clientId = tokenRow.upload_tokens.clientId;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `clients/${clientId}/incoming/${Date.now()}_${file.name}`;
    const blobUrl = await storageService.save(storagePath, fileBuffer, file.type);

    // 4. Create document record
    const [doc] = await db
      .insert(documents)
      .values({
        clientId,
        uploadTokenId: tokenRow.upload_tokens.id,
        originalFilename: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
        storedPath: blobUrl,
        status: "UPLOADED",
      })
      .returning();

    // 5. Increment upload count on token
    await db
      .update(uploadTokens)
      .set({ uploadCount: tokenRow.upload_tokens.uploadCount + 1 })
      .where(eq(uploadTokens.id, tokenRow.upload_tokens.id));

    // 6. Audit log
    await auditService.log({
      actorType: "CLIENT",
      action: "DOCUMENT_UPLOADED",
      documentId: doc.id,
      clientId,
      details: {
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        tokenId: tokenRow.upload_tokens.id,
      },
    });

    clearServerCacheByPrefix(`${TOKEN_CONTEXT_CACHE_PREFIX}${token}`);
    clearServerCacheByPrefix("broker:tokens:");
    clearServerCacheByPrefix("broker:clients:");

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        documentId: doc.id,
        filename: file.name,
        status: doc.status,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Upload failed" } },
      { status: 500 }
    );
  }
}
