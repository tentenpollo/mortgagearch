"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  EmptyState,
  LoadingState,
  MetricCard,
  PageHeader,
  StatusBadge,
  buttonClassName,
  cn,
} from "@/components/ui/primitives";

function getAuthHeaders() {
  return {
    Authorization: `Basic ${btoa("admin:admin123")}`,
    "Content-Type": "application/json",
  };
}

type LinkStatusFilter = "all" | "active" | "uploaded" | "no-links";
type SortBy = "newest" | "name-asc" | "name-desc";

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt: string;
  linkCount: number;
  uploadedLinkCount: number;
}

interface UploadToken {
  id: string;
  token: string;
  reason: string;
  uploadUrl: string;
  uploadCount: number;
  uploaded: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface ClientListResponse {
  items: Client[];
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
}

const defaultPagination = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
  hasPrevPage: false,
  hasNextPage: false,
};

const defaultSummary = {
  totalClients: 0,
  totalLinks: 0,
  uploadedLinks: 0,
  pendingLinks: 0,
};

export default function ClientsPage() {
  const clientsAbortRef = useRef<AbortController | null>(null);
  const clientsFetchIdRef = useRef(0);

  const [clients, setClients] = useState<Client[]>([]);
  const [pagination, setPagination] = useState(defaultPagination);
  const [summary, setSummary] = useState(defaultSummary);

  const [clientTokens, setClientTokens] = useState<Record<string, UploadToken[]>>({});
  const [tokensLoading, setTokensLoading] = useState<Record<string, boolean>>({});
  const [tokensLoaded, setTokensLoaded] = useState<Record<string, boolean>>({});
  const [tokensError, setTokensError] = useState<Record<string, string | null>>({});

  const [loading, setLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [generatingToken, setGeneratingToken] = useState<string | null>(null);
  const [tokenReasonByClient, setTokenReasonByClient] = useState<Record<string, string>>({});
  const [showReasonInput, setShowReasonInput] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [deletingTokenId, setDeletingTokenId] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LinkStatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 250);

    return () => clearTimeout(timeout);
  }, [searchInput]);

  const fetchClients = async (showFullLoader = false) => {
    const fetchId = clientsFetchIdRef.current + 1;
    clientsFetchIdRef.current = fetchId;

    clientsAbortRef.current?.abort();
    const controller = new AbortController();
    clientsAbortRef.current = controller;

    try {
      if (showFullLoader) {
        setLoading(true);
      } else {
        setListLoading(true);
      }

      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        status: statusFilter,
        sortBy,
      });

      if (search) {
        params.set("search", search);
      }

      const res = await fetch(`/api/broker/clients?${params.toString()}`, {
        headers: getAuthHeaders(),
        cache: "no-store",
        signal: controller.signal,
      });

      const data = await res.json();

      if (data.success) {
        const payload = data.data as ClientListResponse;
        setClients(payload.items);
        setPagination(payload.pagination);
        setSummary(payload.summary);
      }
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      console.error(err);
    } finally {
      if (clientsFetchIdRef.current === fetchId) {
        setLoading(false);
        setListLoading(false);
      }
    }
  };

  const fetchTokensForClient = async (clientId: string, force = false) => {
    if (!force && (tokensLoaded[clientId] || tokensLoading[clientId])) {
      return;
    }

    setTokensLoading((prev) => ({ ...prev, [clientId]: true }));
    setTokensError((prev) => ({ ...prev, [clientId]: null }));

    try {
      const res = await fetch(`/api/broker/tokens/${clientId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setClientTokens((prev) => ({ ...prev, [clientId]: data.data }));
        setTokensLoaded((prev) => ({ ...prev, [clientId]: true }));
      } else {
        setTokensError((prev) => ({ ...prev, [clientId]: data.error?.message ?? "Failed to load links" }));
      }
    } catch {
      setTokensError((prev) => ({ ...prev, [clientId]: "Network error while loading links" }));
    } finally {
      setTokensLoading((prev) => ({ ...prev, [clientId]: false }));
    }
  };

  useEffect(() => {
    fetchClients(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      clientsAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    fetchClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, search, statusFilter, sortBy]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/broker/clients", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setForm({ name: "", email: "", phone: "" });
        setShowForm(false);
        setPage(1);
        await fetchClients();
      } else {
        alert(data.error?.message ?? "Failed to create client");
      }
    } catch {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateToken = async (clientId: string) => {
    const reason = tokenReasonByClient[clientId]?.trim() ?? "";

    if (!reason) {
      alert("Please provide a reason for this upload link");
      return;
    }

    setGeneratingToken(clientId);
    try {
      const res = await fetch("/api/broker/tokens", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          clientId,
          reason,
          maxUploads: 10,
          expiresInHours: 72,
        }),
      });
      const data = await res.json();
      if (data.success) {
        const newToken: UploadToken = {
          id: data.data.id,
          token: data.data.token,
          reason: data.data.reason,
          uploadUrl: data.data.uploadUrl,
          uploadCount: 0,
          uploaded: false,
          expiresAt: data.data.expiresAt,
          createdAt: data.data.createdAt,
        };

        setClientTokens((prev) => ({
          ...prev,
          [clientId]: [newToken, ...(prev[clientId] || [])],
        }));

        setClients((prev) =>
          prev.map((client) =>
            client.id === clientId
              ? {
                  ...client,
                  linkCount: client.linkCount + 1,
                }
              : client
          )
        );

        setSummary((prev) => ({
          ...prev,
          totalLinks: prev.totalLinks + 1,
          pendingLinks: prev.pendingLinks + 1,
        }));

        setTokensLoaded((prev) => ({ ...prev, [clientId]: true }));
        setTokenReasonByClient((prev) => ({ ...prev, [clientId]: "" }));
        setShowReasonInput(null);
      } else {
        alert(data.error?.message ?? "Failed to generate token");
      }
    } catch {
      alert("Network error");
    } finally {
      setGeneratingToken(null);
    }
  };

  const handleDeleteToken = async (clientId: string, tokenId: string) => {
    const confirmed = window.confirm(
      "Delete this upload link? This will also delete all files uploaded through this link."
    );
    if (!confirmed) return;

    setDeletingTokenId(tokenId);

    try {
      const res = await fetch(`/api/broker/tokens/${clientId}?tokenId=${tokenId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (!data.success) {
        alert(data.error?.message ?? "Failed to delete link");
        return;
      }

      const removed = clientTokens[clientId]?.find((token) => token.id === tokenId);

      setClientTokens((prev) => ({
        ...prev,
        [clientId]: (prev[clientId] || []).filter((token) => token.id !== tokenId),
      }));

      setClients((prev) =>
        prev.map((client) => {
          if (client.id !== clientId) return client;
          return {
            ...client,
            linkCount: Math.max(0, client.linkCount - 1),
            uploadedLinkCount:
              removed && removed.uploaded
                ? Math.max(0, client.uploadedLinkCount - 1)
                : client.uploadedLinkCount,
          };
        })
      );

      setSummary((prev) => {
        const uploadedDecrement = removed && removed.uploaded ? 1 : 0;
        const totalLinks = Math.max(0, prev.totalLinks - 1);
        const uploadedLinks = Math.max(0, prev.uploadedLinks - uploadedDecrement);
        return {
          ...prev,
          totalLinks,
          uploadedLinks,
          pendingLinks: Math.max(0, totalLinks - uploadedLinks),
        };
      });
    } catch {
      alert("Network error");
    } finally {
      setDeletingTokenId(null);
    }
  };

  const copyLink = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pageWindow = useMemo(() => {
    const radius = 1;
    const pages = new Set<number>();
    pages.add(1);
    pages.add(pagination.totalPages);
    for (let i = Math.max(1, page - radius); i <= Math.min(pagination.totalPages, page + radius); i += 1) {
      pages.add(i);
    }
    return Array.from(pages).sort((a, b) => a - b);
  }, [page, pagination.totalPages]);

  const hasFilters = Boolean(search) || statusFilter !== "all" || sortBy !== "newest";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Intake"
        title="Clients"
        description="Run your borrower intake with fast search, clean actions, and instant link tracking."
        actions={
          <button onClick={() => setShowForm(true)} className={buttonClassName("primary")}>
            + New client
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Matching clients" value={pagination.total} detail={`Page ${pagination.page} of ${pagination.totalPages}`} />
        <MetricCard label="Upload links" value={summary.totalLinks} />
        <MetricCard label="Links with uploads" value={summary.uploadedLinks} />
        <MetricCard label="Pending links" value={summary.pendingLinks} />
      </div>

      {showForm && (
        <Card className="card-pad border-brand-200 bg-brand-50/30">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-slate-950">Create new client</p>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleCreateClient} className="mt-4 flex flex-wrap gap-4">
            <div className="min-w-[180px] flex-1">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
                placeholder="Full name"
                required
              />
            </div>
            <div className="min-w-[200px] flex-1">
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input"
                type="email"
                placeholder="Email address"
                required
              />
            </div>
            <div className="min-w-[150px] flex-1">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input"
                placeholder="Phone (optional)"
              />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={submitting} className={buttonClassName("primary")}>
                {submitting ? "Creating..." : "Create"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className={buttonClassName("ghost")}>
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <Card className="card-pad space-y-4 border-slate-200">
        <div className="grid gap-3 lg:grid-cols-[1fr_200px_190px_160px_auto]">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.5 3a5.5 5.5 0 104.345 8.87l2.643 2.643a1 1 0 001.414-1.414l-2.643-2.643A5.5 5.5 0 008.5 3zm-3.5 5.5a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z"
                clipRule="evenodd"
              />
            </svg>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input pl-9"
              placeholder="Search by name, email, or phone"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value as LinkStatusFilter);
            }}
            className="input"
          >
            <option value="all">All statuses</option>
            <option value="active">Has pending links</option>
            <option value="uploaded">Has uploads</option>
            <option value="no-links">No links</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              setPage(1);
              setSortBy(e.target.value as SortBy);
            }}
            className="input"
          >
            <option value="newest">Newest first</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
          </select>

          <select
            value={String(pageSize)}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number(e.target.value));
            }}
            className="input"
          >
            <option value="10">10 / page</option>
            <option value="20">20 / page</option>
            <option value="50">50 / page</option>
          </select>

          <button
            onClick={() => {
              setSearchInput("");
              setSearch("");
              setStatusFilter("all");
              setSortBy("newest");
              setPage(1);
            }}
            disabled={!hasFilters}
            className={buttonClassName("ghost")}
          >
            Reset
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <p>
            Showing <span className="font-semibold text-slate-700">{clients.length}</span> on this page, from a total of{" "}
            <span className="font-semibold text-slate-700">{pagination.total}</span> clients.
          </p>
          {listLoading && <p className="text-brand-700">Refreshing results...</p>}
        </div>
      </Card>

      <Card className="overflow-hidden border-slate-200">
        {loading ? (
          <LoadingState label="Loading clients..." />
        ) : pagination.total === 0 ? (
          hasFilters ? (
            <EmptyState
              title="No matching clients"
              description="Try broadening your search or clearing filters to see more results."
              action={
                <button
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setStatusFilter("all");
                    setSortBy("newest");
                    setPage(1);
                  }}
                  className={buttonClassName("secondary")}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              title="No clients yet"
              description="Create your first client to start generating upload links."
              action={
                <button onClick={() => setShowForm(true)} className={buttonClassName("primary")}>
                  Create client
                </button>
              }
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-brand-50/30 text-left">
                  <th className="px-4 py-3 font-medium text-slate-600">Client</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Contact</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Link activity</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Actions</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Links</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => {
                  const expanded = expandedClient === client.id;
                  const tokenList = clientTokens[client.id] ?? [];
                  const pendingCount = Math.max(0, client.linkCount - client.uploadedLinkCount);
                  const reasonInput = tokenReasonByClient[client.id] ?? "";

                  return (
                    <>
                      <tr key={client.id} className="group hover:bg-brand-50/20">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">{client.name}</div>
                              <div className="text-xs text-slate-400">Added {formatDate(client.createdAt)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          <div>{client.email}</div>
                          {client.phone && <div className="text-slate-400">{client.phone}</div>}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone="info">{client.linkCount} total</StatusBadge>
                            <StatusBadge tone="success">{client.uploadedLinkCount} uploaded</StatusBadge>
                            <StatusBadge tone="neutral">{pendingCount} pending</StatusBadge>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {showReasonInput === client.id ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  value={reasonInput}
                                  onChange={(e) =>
                                    setTokenReasonByClient((prev) => ({
                                      ...prev,
                                      [client.id]: e.target.value,
                                    }))
                                  }
                                  className="input w-56"
                                  placeholder="Reason..."
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleGenerateToken(client.id)}
                                  disabled={generatingToken === client.id || !reasonInput.trim()}
                                  className={buttonClassName("primary")}
                                >
                                  {generatingToken === client.id ? "Generating..." : "Generate"}
                                </button>
                                <button
                                  onClick={() => {
                                    setShowReasonInput(null);
                                    setTokenReasonByClient((prev) => ({ ...prev, [client.id]: "" }));
                                  }}
                                  className={buttonClassName("ghost")}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowReasonInput(client.id)}
                                className="text-sm font-medium text-brand-700 hover:text-brand-800"
                              >
                                + Generate link
                              </button>
                            )}

                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {client.linkCount > 0 ? (
                            <button
                              onClick={async () => {
                                const nextExpanded = expanded ? null : client.id;
                                setExpandedClient(nextExpanded);
                                if (nextExpanded) {
                                  await fetchTokensForClient(client.id);
                                }
                              }}
                              aria-label={expanded ? "Collapse links" : "Expand links"}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-brand-700"
                            >
                              <svg
                                className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          ) : null}
                        </td>
                      </tr>

                      {expanded && (
                        <tr key={`${client.id}-expanded`}>
                          <td colSpan={5} className="bg-slate-50/70 px-4 py-4">
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                              {tokensLoading[client.id] ? (
                                <div className="p-4 text-sm text-slate-500">Loading links...</div>
                              ) : tokensError[client.id] ? (
                                <div className="flex items-center justify-between p-4">
                                  <p className="text-sm text-red-600">{tokensError[client.id]}</p>
                                  <button
                                    onClick={() => fetchTokensForClient(client.id, true)}
                                    className={buttonClassName("secondary")}
                                  >
                                    Retry
                                  </button>
                                </div>
                              ) : tokenList.length === 0 ? (
                                <div className="p-4 text-sm text-slate-500">No links for this client.</div>
                              ) : (
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-left text-slate-500">
                                      <th className="px-4 py-3 font-medium">Reason</th>
                                      <th className="px-4 py-3 font-medium">Requested</th>
                                      <th className="px-4 py-3 font-medium">Expires</th>
                                      <th className="px-4 py-3 font-medium">Status</th>
                                      <th className="px-4 py-3 font-medium">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tokenList.map((token) => (
                                      <tr key={token.id} className="border-t border-slate-100">
                                        <td className="px-4 py-3 text-slate-700">{token.reason}</td>
                                        <td className="px-4 py-3 text-slate-500">{formatDate(token.createdAt)}</td>
                                        <td className="px-4 py-3 text-slate-500">{formatDate(token.expiresAt)}</td>
                                        <td className="px-4 py-3">
                                          {token.uploaded ? (
                                            <StatusBadge tone="success">{token.uploadCount} uploaded</StatusBadge>
                                          ) : (
                                            <StatusBadge tone="neutral">Pending</StatusBadge>
                                          )}
                                        </td>
                                        <td className="px-4 py-3">
                                          <div className="flex flex-wrap items-center gap-3">
                                            <button
                                              onClick={() => copyLink(token.uploadUrl, token.id)}
                                              className="font-medium text-brand-700 hover:text-brand-800"
                                            >
                                              {copiedId === token.id ? "Copied!" : "Copy link"}
                                            </button>
                                            <button
                                              onClick={() => handleDeleteToken(client.id, token.id)}
                                              disabled={deletingTokenId === token.id}
                                              className="font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                              {deletingTokenId === token.id ? "Deleting..." : "Delete"}
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {!loading && pagination.total > 0 && (
        <Card className="card-pad">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              Page <span className="font-semibold text-slate-900">{pagination.page}</span> of{" "}
              <span className="font-semibold text-slate-900">{pagination.totalPages}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={!pagination.hasPrevPage}
                className={buttonClassName("ghost", "h-9 px-3")}
              >
                First
              </button>
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={!pagination.hasPrevPage}
                className={buttonClassName("ghost", "h-9 px-3")}
              >
                Prev
              </button>

              {pageWindow.map((pageNumber, index) => {
                const previous = pageWindow[index - 1];
                const showGap = index > 0 && previous !== undefined && pageNumber - previous > 1;
                return (
                  <div key={pageNumber} className="flex items-center">
                    {showGap && <span className="px-2 text-slate-400">...</span>}
                    <button
                      onClick={() => setPage(pageNumber)}
                      className={cn(
                        "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium",
                        page === pageNumber
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {pageNumber}
                    </button>
                  </div>
                );
              })}

              <button
                onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                disabled={!pagination.hasNextPage}
                className={buttonClassName("ghost", "h-9 px-3")}
              >
                Next
              </button>
              <button
                onClick={() => setPage(pagination.totalPages)}
                disabled={!pagination.hasNextPage}
                className={buttonClassName("ghost", "h-9 px-3")}
              >
                Last
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
