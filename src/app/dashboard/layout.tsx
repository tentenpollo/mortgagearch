"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { buttonClassName, cn } from "@/components/ui/primitives";

const navItems = [
  {
    label: "Documents",
    href: "/dashboard",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
  {
    label: "Clients",
    href: "/dashboard/clients",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    label: "Audit Log",
    href: "/dashboard/audit",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/documents");
  }
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
    <>
      <div className={cn("flex items-center gap-3 px-1 py-2", collapsed && !mobile && "justify-center")}> 
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        {(!collapsed || mobile) && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">MortgageArch</p>
            <p className="text-xs text-slate-500">Broker admin</p>
          </div>
        )}
      </div>

      <nav className="mt-6 flex flex-1 flex-col gap-2" aria-label="Sidebar navigation">
        {navItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex h-12 items-center rounded-xl border px-3 text-sm font-semibold transition-all duration-150",
                collapsed && !mobile ? "justify-center px-0" : "gap-3",
                active
                  ? "border-brand-100 bg-brand-50 text-brand-800"
                  : "border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              )}
              title={collapsed && !mobile ? item.label : undefined}
            >
              {active ? <span className="absolute left-0 top-2 h-8 w-1 rounded-r-full bg-brand-600" /> : null}
              <span className={cn("shrink-0", active && "text-brand-700")}>{item.icon}</span>
              {(!collapsed || mobile) && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t border-slate-200 pt-4">
        <button
          onClick={async () => {
            try {
              await fetch("/dashboard", {
                headers: { Authorization: "Basic bG9nb3V0OmxvZ291dA==" },
              });
            } catch {}
            window.location.href = "/";
          }}
          className={cn(buttonClassName("secondary"), "h-11 w-full", collapsed && !mobile && "justify-center px-0")}
          title={collapsed && !mobile ? "Sign out" : undefined}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          {(!collapsed || mobile) && <span>Sign out</span>}
        </button>
        {(!collapsed || mobile) && <p className="mt-3 text-center text-xs text-slate-500">Prototype v0</p>}
      </div>
    </>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("dashboard-sidebar-collapsed");
    if (stored === "1") setDesktopCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("dashboard-sidebar-collapsed", desktopCollapsed ? "1" : "0");
  }, [desktopCollapsed]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileSidebarOpen]);

  return (
    <div className="min-h-screen lg:flex">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className={buttonClassName("secondary", "h-10 px-3")}
            aria-label="Open navigation"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            <span>Menu</span>
          </button>
          <p className="text-sm font-semibold text-slate-900">MortgageArch</p>
          <div className="w-[76px]" />
        </div>
      </header>

      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Sidebar menu">
          <button
            className="absolute inset-0 bg-slate-950/30"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 w-[86%] max-w-[320px] border-r border-slate-200 bg-slate-50 p-4 shadow-xl">
            <div className="flex h-full flex-col">
              <div className="mb-3 flex justify-end">
                <button
                  onClick={() => setMobileSidebarOpen(false)}
                  className={buttonClassName("secondary", "h-9 px-3")}
                  aria-label="Close menu"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                  <span>Close</span>
                </button>
              </div>
              <SidebarContent pathname={pathname} collapsed={false} mobile onNavigate={() => setMobileSidebarOpen(false)} />
            </div>
          </aside>
        </div>
      )}

      <div className="relative hidden lg:sticky lg:top-0 lg:flex lg:h-screen">
        <aside className={cn("h-full border-r border-slate-200 bg-white p-4 transition-[width] duration-200", desktopCollapsed ? "w-[92px]" : "w-[276px]")}> 
          <div className="flex h-full flex-col p-2">
            <SidebarContent pathname={pathname} collapsed={desktopCollapsed} mobile={false} />
          </div>
        </aside>

        <button
          onClick={() => setDesktopCollapsed((v) => !v)}
          className="absolute -right-3 top-8 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-brand-200 hover:text-brand-700"
          aria-label={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg className={cn("h-4 w-4 transition-transform", desktopCollapsed && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
      </div>

      <main className="min-w-0 flex-1">
        <div className="page-container">{children}</div>
      </main>
    </div>
  );
}
