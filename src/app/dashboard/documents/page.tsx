import { getSession } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { documentsService } from "@/lib/services/documents.service";
import { clientsService } from "@/lib/services/clients.service";
import { PageHeader, Card, CardContent, StatusBadge, EmptyState } from "@/components/ui";
import { FileText } from "lucide-react";
import Link from "next/link";
import { formatDateTime, formatFileSize } from "@/lib/utils";
import { DocumentsToolbar } from "./documents-toolbar";
import type { DocumentStatus } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{
    status?: DocumentStatus;
    clientId?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function DocumentsPage({ searchParams }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const status = params.status;
  const clientId = params.clientId;
  const search = params.search || "";

  // Fetch documents with filters
  const result = await documentsService.list(user.id, {
    status,
    clientId,
    search,
    page,
    limit: 20,
  });

  // Fetch all clients for filter dropdown
  const clientsResult = await clientsService.list(user.id, { limit: 1000 });

  return (
    <>
      <PageHeader
        title="Documents"
        description="Review and manage uploaded documents"
      />

      <DocumentsToolbar
        initialStatus={status}
        initialClientId={clientId}
        initialSearch={search}
        clients={clientsResult.items}
      />

      {result.items.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-6 w-6" />}
          title={search || status || clientId ? "No documents found" : "No documents yet"}
          description={
            search || status || clientId
              ? "Try adjusting your filters"
              : "Documents will appear here once clients start uploading"
          }
        />
      ) : (
        <>
          <div className="mt-4 space-y-3">
            {result.items.map(({ document, client }) => (
              <Link
                key={document.id}
                href={`/dashboard/documents/${document.id}`}
              >
                <Card className="cursor-pointer transition-all hover:shadow-card-hover hover:border-brand-200">
                  <CardContent>
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-slate-400 flex-shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">
                              {document.originalFilename}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              Client: {client.name}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                              <span>{formatFileSize(document.fileSizeBytes)}</span>
                              <span>•</span>
                              <span>{formatDateTime(document.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={document.status as DocumentStatus} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {result.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
              <p>
                Showing {(result.page - 1) * result.limit + 1}–
                {Math.min(result.page * result.limit, result.total)} of{" "}
                {result.total}
              </p>
              <div className="flex gap-2">
                {result.page > 1 && (
                  <Link
                    href={`/dashboard/documents?${new URLSearchParams({
                      ...(status && { status: status as string }),
                      ...(clientId && { clientId }),
                      ...(search && { search }),
                      page: String(result.page - 1),
                    }).toString()}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                  >
                    Previous
                  </Link>
                )}
                {result.page < result.totalPages && (
                  <Link
                    href={`/dashboard/documents?${new URLSearchParams({
                      ...(status && { status: status as string }),
                      ...(clientId && { clientId }),
                      ...(search && { search }),
                      page: String(result.page + 1),
                    }).toString()}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
