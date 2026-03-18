import { NextRequest, NextResponse } from "next/server";
import { requireBrokerAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditLogs, documents, clients } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import type { ApiResponse } from "@/lib/types";

export async function GET(request: NextRequest) {
  const authError = requireBrokerAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 500);

    const conditions = documentId ? eq(auditLogs.documentId, documentId) : undefined;

    const logs = await db
      .select()
      .from(auditLogs)
      .where(conditions)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    return NextResponse.json<ApiResponse>({
      success: true,
      data: logs,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch audit logs" } },
      { status: 500 }
    );
  }
}
