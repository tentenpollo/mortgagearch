"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { logoutAction } from "@/app/actions/auth.actions";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Clients",
    href: "/dashboard/clients",
    icon: Users,
  },
  {
    label: "Documents",
    href: "/dashboard/documents",
    icon: FileText,
  },
  {
    label: "Audit Log",
    href: "/dashboard/audit",
    icon: ClipboardList,
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname.startsWith(href);
}

function SidebarContent({
  pathname,
  collapsed,
  mobile,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  mobile: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 px-2 py-3",
          collapsed && !mobile && "justify-center",
        )}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
          <FileText className="h-5 w-5" />
        </div>
        {(!collapsed || mobile) && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              MortgageArch
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="Sidebar">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex h-11 items-center rounded-xl px-3 text-sm font-medium transition-all duration-150",
                collapsed && !mobile ? "justify-center px-0" : "gap-3",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
              title={collapsed && !mobile ? item.label : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1.5 h-8 w-1 rounded-r-full bg-brand-600" />
              )}
              <Icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0",
                  active
                    ? "text-brand-600"
                    : "text-slate-400 group-hover:text-slate-600",
                )}
              />
              {(!collapsed || mobile) && (
                <span className="truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="mt-auto border-t border-slate-200 pt-4">
        <form action={logoutAction}>
          <button
            type="submit"
            className={cn(
              "flex h-11 w-full items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900",
              collapsed && !mobile ? "justify-center px-0" : "gap-3",
            )}
            title={collapsed && !mobile ? "Sign out" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {(!collapsed || mobile) && <span>Sign out</span>}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen lg:flex">
      {/* Mobile topbar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
          <span>Menu</span>
        </button>
        <p className="text-sm font-bold text-slate-900">MortgageArch</p>
        <div className="w-[76px]" />
      </header>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 w-[86%] max-w-[320px] border-r border-slate-200 bg-white p-4 shadow-xl animate-slide-in-right">
            <div className="mb-3 flex justify-end">
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
                Close
              </button>
            </div>
            <SidebarContent
              pathname={pathname}
              collapsed={false}
              mobile
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="relative hidden lg:sticky lg:top-0 lg:flex lg:h-screen">
        <aside
          className={cn(
            "h-full border-r border-slate-200 bg-white p-4 transition-[width] duration-200",
            collapsed ? "w-[80px]" : "w-[260px]",
          )}
        >
          <SidebarContent
            pathname={pathname}
            collapsed={collapsed}
            mobile={false}
          />
        </aside>

        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-3 top-8 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:border-brand-200 hover:text-brand-600"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft
            className={cn(
              "h-4 w-4 transition-transform",
              collapsed && "rotate-180",
            )}
          />
        </button>
      </div>

      {/* Main content */}
      <main className="min-w-0 flex-1">
        <div className="page-container">{children}</div>
      </main>
    </div>
  );
}
