import { NextRequest, NextResponse } from "next/server";
import { requireBrokerAuth } from "@/lib/auth";
import { documentService } from "@/lib/services/document.service";
import { storageService } from "@/lib/services/storage.service";
import type { ApiResponse } from "@/lib/types";

const OCR_TEXT_PREVIEW_LIMIT = 20000;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = requireBrokerAuth(request);
  if (authError) return authError;

  try {
    const row = await documentService.getById(params.id);

    if (!row) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    let ocrText: string | null = null;
    const ocrTextPath = row.documents.ocrTextPath;

    if (typeof ocrTextPath === "string" && ocrTextPath.length > 0) {
      try {
        const blob = await storageService.head(ocrTextPath);
        if (blob) {
          const resp = await fetch(blob.url);
          if (resp.ok) {
            const text = await resp.text();
            ocrText = text.slice(0, OCR_TEXT_PREVIEW_LIMIT);
          }
        }
      } catch (error) {
        console.error("Failed to load OCR text:", error);
      }
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...row.documents,
        client: row.clients,
        ocrText,
      },
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    console.error("Get document error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to get document" } },
      { status: 500 }
    );
  }
}

/** PATCH — used by the worker to update OCR/AI results */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updated = await documentService.update(params.id, body);

    if (!updated) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("Patch document error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update document" } },
      { status: 500 }
    );
  }
}
