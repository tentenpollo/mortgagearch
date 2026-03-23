import { getSession } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { clientsService } from "@/lib/services/clients.service";
import { tokensService } from "@/lib/services/tokens.service";
import { documentsService } from "@/lib/services/documents.service";
import { PageHeader, Card, CardContent, Badge, EmptyState, Button } from "@/components/ui";
import { Mail, Phone, FileText, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { formatDate, formatDateTime, formatFileSize } from "@/lib/utils";
import { ClientDetailPanels } from "./client-detail-panels";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ClientDetailPage({ params }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");

  const { id } = await params;

  // Fetch client and verify ownership
  const client = await clientsService.getById(id, user.id);
  if (!client) notFound();

  // Fetch upload tokens and documents
  const [tokens, documentsResult] = await Promise.all([
    tokensService.listByClient(id, user.id),
    documentsService.list(user.id, { clientId: id, limit: 10 }),
  ]);

  return (
    <>
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Clients
      </Link>

      <PageHeader
        title={client.name}
        description="Client profile and document management"
      />

      {/* Client Info Card */}
      <Card className="mt-6">
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Mail className="h-4 w-4" />
                Email
              </div>
              <a
                href={`mailto:${client.email}`}
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                {client.email}
              </a>
            </div>

            {client.phone && (
              <div>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                  <Phone className="h-4 w-4" />
                  Phone
                </div>
                <a
                  href={`tel:${client.phone}`}
                  className="text-sm font-medium text-slate-900"
                >
                  {client.phone}
                </a>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <Calendar className="h-4 w-4" />
                Client Since
              </div>
              <p className="text-sm font-medium text-slate-900">
                {formatDate(client.createdAt)}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                <FileText className="h-4 w-4" />
                Total Documents
              </div>
              <p className="text-sm font-medium text-slate-900">
                {documentsResult.total}
              </p>
            </div>
          </div>

          {client.notes && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-sm text-slate-500 mb-1">Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {client.notes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Links - Interactive Client Component */}
      <ClientDetailPanels
        clientId={client.id}
        clientName={client.name}
        tokens={tokens}
      />

      {/* Recent Documents */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Recent Documents</h2>
          <Link
            href={`/dashboard/documents?clientId=${client.id}`}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            View All
          </Link>
        </div>

        {documentsResult.items.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">
                No documents uploaded yet
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {documentsResult.items.slice(0, 5).map(({ document }) => (
              <Link
                key={document.id}
                href={`/dashboard/documents/${document.id}`}
              >
                <Card className="cursor-pointer transition-all hover:shadow-card-hover hover:border-brand-200">
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {document.originalFilename}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                          <span>{formatFileSize(document.fileSizeBytes)}</span>
                          <span>•</span>
                          <span>{formatDateTime(document.createdAt)}</span>
                        </div>
                      </div>
                      <Badge color="brand">{document.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
