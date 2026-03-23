import { getSession } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { documentsService } from "@/lib/services/documents.service";
import { auditService } from "@/lib/services/audit.service";
import { PageHeader, Card, CardContent, StatusBadge, Badge } from "@/components/ui";
import { FileText, Download, ExternalLink, User, Calendar, Clock, AlertCircle, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatDateTime, formatFileSize } from "@/lib/utils";
import { ReviewActions } from "./review-actions";
import type { DocumentStatus } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;

  // Fetch document and verify ownership through client
  const docData = await documentsService.getById(id);
  if (!docData) notFound();

  const { document, client } = docData;
  if (client.brokerId !== user.id) notFound();

  // Fetch audit logs for this document
  const auditLogs = await auditService.list(user.id, {
    documentId: id,
    limit: 100,
  });

  return (
    <>
      <Link
        href="/dashboard/documents"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Documents
      </Link>

      <PageHeader
        title={document.originalFilename}
        description={`Document from ${client.name}`}
        actions={
          <ReviewActions
            documentId={document.id}
            status={document.status}
            reviewDecision={document.reviewDecision}
            reviewedAt={document.reviewedAt}
          />
        }
      />

      {/* Document Info Card */}
      <Card className="mt-6">
        <CardContent>
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-slate-100">
                <FileText className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {document.originalFilename}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {formatFileSize(document.fileSizeBytes)} • {document.mimeType}
                </p>
              </div>
            </div>
            <StatusBadge status={document.status as DocumentStatus} />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 border-t border-slate-100 pt-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <User className="h-4 w-4" />
                Client
              </div>
              <Link
                href={`/dashboard/clients/${client.id}`}
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {client.name}
              </Link>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Calendar className="h-4 w-4" />
                Uploaded
              </div>
              <p className="text-sm font-medium text-slate-900">
                {formatDateTime(document.createdAt)}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Download className="h-4 w-4" />
                Download
              </div>
              <a
                href={document.storedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                View/Download File
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {document.updatedAt && document.updatedAt.getTime() !== document.createdAt.getTime() && (
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <Clock className="h-4 w-4" />
                  Last Updated
                </div>
                <p className="text-sm font-medium text-slate-900">
                  {formatDateTime(document.updatedAt)}
                </p>
              </div>
            )}
          </div>

          {document.statusReason && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Status Note</p>
                  <p className="mt-1 text-sm text-slate-600">{document.statusReason}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Information */}
      {document.reviewedAt && (
        <Card className="mt-6">
          <CardContent>
            <div className="flex items-start gap-3">
              {document.reviewDecision === "APPROVED" ? (
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {document.reviewDecision === "APPROVED" ? "Approved" : "Rejected"}
                  </h3>
                  <Badge color={document.reviewDecision === "APPROVED" ? "green" : "red"}>
                    Final Decision
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  Reviewed {formatDateTime(document.reviewedAt)}
                </p>
                {document.reviewNotes && (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">
                      {document.reviewNotes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Activity History</h2>
        <Card>
          <CardContent className="p-0">
            {auditLogs.items.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-slate-500">No activity recorded yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLogs.items.map((log) => (
                  <div key={log.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900">
                            {log.action.replace(/_/g, " ")}
                          </span>
                          <Badge color="gray">{log.actorType}</Badge>
                          {(() => {
                            const details = log.details as Record<string, unknown> | null;
                            return details && 'reviewChanged' in details && details.reviewChanged ? (
                              <Badge color="blue">Review Changed</Badge>
                            ) : null;
                          })()}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDateTime(log.createdAt)}
                        </p>
                        {(() => {
                          const details = log.details as Record<string, unknown> | null;
                          if (!details || Object.keys(details).length === 0) return null;
                          
                          return (
                            <div className="mt-2 text-xs text-slate-600">
                              {Object.entries(details).map(([key, value]) => {
                                if (key === 'reviewChanged' || key === 'automatic') return null;
                                const displayValue = typeof value === 'object' && value !== null
                                  ? JSON.stringify(value)
                                  : value !== null && value !== undefined
                                  ? String(value)
                                  : '';
                                return (
                                  <div key={key} className="mt-0.5">
                                    <span className="font-medium">{key}:</span> {displayValue}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
