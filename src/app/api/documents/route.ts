import { NextRequest, NextResponse } from "next/server";
import { requireBrokerAuth } from "@/lib/auth";
import { documentService } from "@/lib/services/document.service";
import type { ApiResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const authError = await requireBrokerAuth(request);
  if (authError) return authError;

  try {
    const rows = await documentService.list();

    const data = rows.map((row) => ({
      ...row.document,
      client: row.client,
    }));

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("List documents error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to list documents" } },
      { status: 500 }
    );
  }
}
