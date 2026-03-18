import { NextRequest, NextResponse } from "next/server";
import { requireBrokerAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clients, uploadTokens } from "@/lib/db/schema";
import { createClientSchema } from "@/lib/validators";
import { auditService } from "@/lib/services/audit.service";
import {
  clearServerCacheByPrefix,
  getServerCache,
  setServerCache,
} from "@/lib/server-cache";
import type { ApiResponse } from "@/lib/types";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

type StatusFilter = "all" | "active" | "uploaded" | "no-links";
type SortBy = "newest" | "name-asc" | "name-desc";

const BROKER_CLIENTS_CACHE_PREFIX = "broker:clients:";

type ClientsPayload = {
  items: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    folderPath: string;
    createdAt: Date;
    updatedAt: Date;
    linkCount: number;
    uploadedLinkCount: number;
  }[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
  };
  summary: {
    totalClients: number;
    totalLinks: number;
    uploadedLinks: number;
    pendingLinks: number;
  };
};

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

export async function GET(request: NextRequest) {
  const authError = requireBrokerAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1);
    const pageSize = Math.min(parsePositiveInt(searchParams.get("pageSize"), 10), 50);
    const search = (searchParams.get("search") ?? "").trim();
    const status = (searchParams.get("status") ?? "all") as StatusFilter;
    const sortBy = (searchParams.get("sortBy") ?? "newest") as SortBy;

    const validStatus: StatusFilter[] = ["all", "active", "uploaded", "no-links"];
    const validSortBy: SortBy[] = ["newest", "name-asc", "name-desc"];

    const safeStatus = validStatus.includes(status) ? status : "all";
    const safeSortBy = validSortBy.includes(sortBy) ? sortBy : "newest";

    const cacheKey = `${BROKER_CLIENTS_CACHE_PREFIX}${searchParams.toString() || "default"}`;
    const cached = getServerCache<ClientsPayload>(cacheKey);

    if (cached) {
      return NextResponse.json<ApiResponse>(
        {
          success: true,
          data: cached,
        },
        {
          headers: {
            "Cache-Control": "private, no-store",
          },
        }
      );
    }

    const tokenAgg = db
      .select({
        clientId: uploadTokens.clientId,
        linkCount: sql<number>`count(*)::int`.as("link_count"),
        uploadedLinkCount: sql<number>`count(case when ${uploadTokens.uploadCount} > 0 then 1 end)::int`.as("uploaded_link_count"),
      })
      .from(uploadTokens)
      .groupBy(uploadTokens.clientId)
      .as("token_agg");

    const linkCountExpr = sql<number>`coalesce(${tokenAgg.linkCount}, 0)::int`;
    const uploadedLinkCountExpr = sql<number>`coalesce(${tokenAgg.uploadedLinkCount}, 0)::int`;

    const whereConditions: SQL[] = [];

    if (search) {
      const searchPattern = `%${search}%`;
      const searchCondition = or(
        ilike(clients.name, searchPattern),
        ilike(clients.email, searchPattern),
        ilike(clients.phone, searchPattern)
      );

      if (searchCondition) {
        whereConditions.push(searchCondition);
      }
    }

    if (safeStatus === "active") {
      whereConditions.push(sql`${linkCountExpr} > ${uploadedLinkCountExpr}`);
    } else if (safeStatus === "uploaded") {
      whereConditions.push(sql`${uploadedLinkCountExpr} > 0`);
    } else if (safeStatus === "no-links") {
      whereConditions.push(sql`${linkCountExpr} = 0`);
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [summary] = await db
      .select({
        totalClients: sql<number>`count(*)::int`,
        totalLinks: sql<number>`coalesce(sum(${linkCountExpr}), 0)::int`,
        uploadedLinks: sql<number>`coalesce(sum(${uploadedLinkCountExpr}), 0)::int`,
      })
      .from(clients)
      .leftJoin(tokenAgg, eq(tokenAgg.clientId, clients.id))
      .where(whereClause);

    const offset = (page - 1) * pageSize;
    const sortOrder =
      safeSortBy === "name-asc"
        ? asc(clients.name)
        : safeSortBy === "name-desc"
          ? desc(clients.name)
          : desc(clients.createdAt);

    const items = await db
      .select({
        id: clients.id,
        name: clients.name,
        email: clients.email,
        phone: clients.phone,
        folderPath: clients.folderPath,
        createdAt: clients.createdAt,
        updatedAt: clients.updatedAt,
        linkCount: linkCountExpr.as("link_count"),
        uploadedLinkCount: uploadedLinkCountExpr.as("uploaded_link_count"),
      })
      .from(clients)
      .leftJoin(tokenAgg, eq(tokenAgg.clientId, clients.id))
      .where(whereClause)
      .orderBy(sortOrder)
      .limit(pageSize)
      .offset(offset);

    const total = summary?.totalClients ?? 0;
    const totalLinks = summary?.totalLinks ?? 0;
    const uploadedLinks = summary?.uploadedLinks ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const payload: ClientsPayload = {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasPrevPage: page > 1,
        hasNextPage: page < totalPages,
      },
      summary: {
        totalClients: total,
        totalLinks,
        uploadedLinks,
        pendingLinks: Math.max(0, totalLinks - uploadedLinks),
      },
    };

    setServerCache(cacheKey, payload, 15_000);

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: payload,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (error) {
    console.error("List clients error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to list clients" } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const authError = requireBrokerAuth(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = createClientSchema.safeParse(body);

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

    const [client] = await db
      .insert(clients)
      .values({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone ?? null,
        folderPath: `clients/${parsed.data.name.toLowerCase().replace(/\s+/g, "-")}`,
      })
      .returning();

    await auditService.log({
      actorType: "BROKER",
      actorId: "broker",
      action: "CLIENT_CREATED",
      clientId: client.id,
      details: { name: client.name, email: client.email },
    });

    clearServerCacheByPrefix(BROKER_CLIENTS_CACHE_PREFIX);

    return NextResponse.json<ApiResponse>(
      { success: true, data: client },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create client error:", error);
    return NextResponse.json<ApiResponse>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to create client" } },
      { status: 500 }
    );
  }
}
