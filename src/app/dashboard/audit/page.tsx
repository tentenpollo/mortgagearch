import { getSession } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { auditService } from "@/lib/services/audit.service";
import { clientsService } from "@/lib/services/clients.service";
import { PageHeader, Card, CardContent, Badge, EmptyState } from "@/components/ui";
import { Shield } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import { AuditToolbar } from "./audit-toolbar";

interface PageProps {
  searchParams: Promise<{
    action?: string;
    clientId?: string;
    documentId?: string;
    page?: string;
  }>;
}

export default async function AuditPage({ searchParams }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const action = params.action;
  const clientId = params.clientId;
  const documentId = params.documentId;

  // Fetch audit logs with filters
  const result = await auditService.list(user.id, {
    action,
    clientId,
    documentId,
    page,
    limit: 50,
  });

  // Fetch all clients for filter dropdown
  const clientsResult = await clientsService.list(user.id, { limit: 1000 });

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Complete activity history and compliance trail"
      />

      <AuditToolbar
        initialAction={action}
        initialClientId={clientId}
        initialDocumentId={documentId}
        clients={clientsResult.items}
      />

      {result.items.length === 0 ? (
        <EmptyState
          icon={<Shield className="h-6 w-6" />}
          title={action || clientId ? "No logs found" : "No activity yet"}
          description={
            action || clientId
              ? "Try adjusting your filters"
              : "Activity will be logged here as you and your clients use the system"
          }
        />
      ) : (
        <>
          <Card className="mt-4">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium text-slate-700">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left font-medium text-slate-700">
                        Action
                      </th>
                      <th className="px-6 py-3 text-left font-medium text-slate-700">
                        Actor
                      </th>
                      <th className="px-6 py-3 text-left font-medium text-slate-700">
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {result.items.map((log) => {
                      const details = log.details as Record<string, unknown> | null;
                      const hasDetails = details && Object.keys(details).length > 0;

                      return (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-slate-900 whitespace-nowrap">
                            {formatDateTime(log.createdAt)}
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-medium text-slate-900">
                              {log.action.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <Badge color="gray">{log.actorType}</Badge>
                          </td>
                          <td className="px-6 py-4">
                            {hasDetails ? (
                              <div className="space-y-1">
                                {log.clientId && (
                                  <div className="text-xs text-slate-600">
                                    <span className="font-medium">Client ID:</span>{" "}
                                    <Link
                                      href={`/dashboard/clients/${log.clientId}`}
                                      className="text-brand-600 hover:text-brand-700"
                                    >
                                      {log.clientId.slice(0, 8)}...
                                    </Link>
                                  </div>
                                )}
                                {log.documentId && (
                                  <div className="text-xs text-slate-600">
                                    <span className="font-medium">Document ID:</span>{" "}
                                    <Link
                                      href={`/dashboard/documents/${log.documentId}`}
                                      className="text-brand-600 hover:text-brand-700"
                                    >
                                      {log.documentId.slice(0, 8)}...
                                    </Link>
                                  </div>
                                )}
                                {Object.entries(details || {}).map(([key, value]) => {
                                  if (key === 'automatic') return null;
                                  const displayValue =
                                    typeof value === "object" && value !== null
                                      ? JSON.stringify(value)
                                      : value !== null && value !== undefined
                                      ? String(value)
                                      : "";
                                  if (!displayValue) return null;
                                  return (
                                    <div key={key} className="text-xs text-slate-600">
                                      <span className="font-medium">{key}:</span> {displayValue}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

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
                    href={`/dashboard/audit?${new URLSearchParams({
                      ...(action && { action }),
                      ...(clientId && { clientId }),
                      ...(documentId && { documentId }),
                      page: String(result.page - 1),
                    }).toString()}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                  >
                    Previous
                  </Link>
                )}
                {result.page < result.totalPages && (
                  <Link
                    href={`/dashboard/audit?${new URLSearchParams({
                      ...(action && { action }),
                      ...(clientId && { clientId }),
                      ...(documentId && { documentId }),
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
