import { getSession } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { documentsService } from "@/lib/services/documents.service";
import { clientsService } from "@/lib/services/clients.service";
import { PageHeader, Card, CardContent } from "@/components/ui";
import {
  Users,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const [clientsResult, statusCounts] = await Promise.all([
    clientsService.list(user.id, { limit: 5 }),
    documentsService.countByStatus(user.id),
  ]);

  const totalDocs = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const stats = [
    {
      label: "Total Clients",
      value: clientsResult.total,
      icon: Users,
      color: "text-brand-600 bg-brand-50",
      href: "/dashboard/clients",
    },
    {
      label: "Total Documents",
      value: totalDocs,
      icon: FileText,
      color: "text-blue-600 bg-blue-50",
      href: "/dashboard/documents",
    },
    {
      label: "Pending Review",
      value: statusCounts["PENDING_REVIEW"] || 0,
      icon: Clock,
      color: "text-amber-600 bg-amber-50",
      href: "/dashboard/documents?status=PENDING_REVIEW",
    },
    {
      label: "Approved",
      value: statusCounts["APPROVED"] || 0,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50",
      href: "/dashboard/documents?status=APPROVED",
    },
    {
      label: "Rejected",
      value: statusCounts["REJECTED"] || 0,
      icon: XCircle,
      color: "text-red-600 bg-red-50",
      href: "/dashboard/documents?status=REJECTED",
    },
    {
      label: "Uploaded",
      value: statusCounts["UPLOADED"] || 0,
      icon: Upload,
      color: "text-slate-600 bg-slate-100",
      href: "/dashboard/documents?status=UPLOADED",
    },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back${user.email ? `, ${user.email}` : ""}`}
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="cursor-pointer transition-shadow hover:shadow-card-hover">
                <CardContent className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${stat.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/dashboard/clients">
            <Card className="cursor-pointer transition-shadow hover:shadow-card-hover">
              <CardContent className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Manage Clients
                  </p>
                  <p className="text-xs text-slate-500">
                    View and create borrower profiles
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/documents?status=PENDING_REVIEW">
            <Card className="cursor-pointer transition-shadow hover:shadow-card-hover">
              <CardContent className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Review Documents
                  </p>
                  <p className="text-xs text-slate-500">
                    Approve or reject pending submissions
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/dashboard/audit">
            <Card className="cursor-pointer transition-shadow hover:shadow-card-hover">
              <CardContent className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Audit Log
                  </p>
                  <p className="text-xs text-slate-500">
                    Track all system activity
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </>
  );
}
