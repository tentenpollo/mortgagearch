"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Select } from "@/components/ui";
import { Search } from "lucide-react";
import type { DocumentStatus } from "@/lib/types";

interface DocumentsToolbarProps {
  initialStatus?: DocumentStatus | "";
  initialClientId?: string;
  initialSearch?: string;
  clients: Array<{ id: string; name: string }>;
}

export function DocumentsToolbar({
  initialStatus = "",
  initialClientId = "",
  initialSearch = "",
  clients,
}: DocumentsToolbarProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  const handleSearchChange = (value: string) => {
    setSearch(value);
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.delete("page"); // Reset to page 1 on search
      router.push(`/dashboard/documents?${params.toString()}`);
    });
  };

  const handleStatusChange = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      if (value) {
        params.set("status", value);
      } else {
        params.delete("status");
      }
      params.delete("page"); // Reset to page 1 on filter change
      router.push(`/dashboard/documents?${params.toString()}`);
    });
  };

  const handleClientChange = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      if (value) {
        params.set("clientId", value);
      } else {
        params.delete("clientId");
      }
      params.delete("page"); // Reset to page 1 on filter change
      router.push(`/dashboard/documents?${params.toString()}`);
    });
  };

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by filename or client..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={initialStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        options={[
          { value: "", label: "All Statuses" },
          { value: "UPLOADED", label: "Uploaded" },
          { value: "PROCESSING", label: "Processing" },
          { value: "PENDING_REVIEW", label: "Pending Review" },
          { value: "APPROVED", label: "Approved" },
          { value: "REJECTED", label: "Rejected" },
        ]}
        className="w-full sm:w-48"
      />

      <Select
        value={initialClientId}
        onChange={(e) => handleClientChange(e.target.value)}
        options={[
          { value: "", label: "All Clients" },
          ...clients.map((c) => ({ value: c.id, label: c.name })),
        ]}
        className="w-full sm:w-64"
      />
    </div>
  );
}
