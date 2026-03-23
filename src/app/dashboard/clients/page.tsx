import { getSession } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { clientsService } from "@/lib/services/clients.service";
import { PageHeader, Card, CardContent, EmptyState, Badge } from "@/components/ui";
import { Users, Plus } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { ClientsToolbar } from "./clients-toolbar";

interface PageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function ClientsPage({ searchParams }: PageProps) {
  const user = await getSession();
  if (!user) redirect("/login");

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || "";

  const result = await clientsService.list(user.id, { search, page, limit: 20 });

  return (
    <>
      <PageHeader
        title="Clients"
        description="Manage your borrower profiles"
      />

      <ClientsToolbar initialSearch={search} />

      {result.items.length === 0 ? (
        <EmptyState
          icon={<Users className="h-6 w-6" />}
          title={search ? "No clients found" : "No clients yet"}
          description={
            search
              ? "Try adjusting your search terms"
              : "Create your first client to start collecting documents"
          }
        />
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((client) => (
              <Link
                key={client.id}
                href={`/dashboard/clients/${client.id}`}
              >
                <Card className="cursor-pointer transition-all hover:shadow-card-hover hover:border-brand-200">
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {client.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {client.email}
                        </p>
                      </div>
                      <Badge color="brand">Client</Badge>
                    </div>
                    {client.phone && (
                      <p className="mt-2 text-xs text-slate-400">{client.phone}</p>
                    )}
                    <p className="mt-3 text-2xs text-slate-400">
                      Added {formatDate(client.createdAt)}
                    </p>
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
                    href={`/dashboard/clients?page=${result.page - 1}${search ? `&search=${search}` : ""}`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                  >
                    Previous
                  </Link>
                )}
                {result.page < result.totalPages && (
                  <Link
                    href={`/dashboard/clients?page=${result.page + 1}${search ? `&search=${search}` : ""}`}
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
