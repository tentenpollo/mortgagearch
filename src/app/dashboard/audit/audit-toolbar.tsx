"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui";
import { AUDIT_ACTIONS } from "@/lib/types";

interface AuditToolbarProps {
  initialAction?: string;
  initialClientId?: string;
  initialDocumentId?: string;
  clients: Array<{ id: string; name: string }>;
}

export function AuditToolbar({
  initialAction = "",
  initialClientId = "",
  initialDocumentId = "",
  clients,
}: AuditToolbarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleActionChange = (value: string) => {
    startTransition(() => {
      const params = new URLSearchParams(window.location.search);
      if (value) {
        params.set("action", value);
      } else {
        params.delete("action");
      }
      params.delete("page");
      router.push(`/dashboard/audit?${params.toString()}`);
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
      params.delete("page");
      router.push(`/dashboard/audit?${params.toString()}`);
    });
  };

  return (
    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <Select
        value={initialAction}
        onChange={(e) => handleActionChange(e.target.value)}
        options={[
          { value: "", label: "All Actions" },
          ...AUDIT_ACTIONS.map((action) => ({
            value: action,
            label: action.replace(/_/g, " "),
          })),
        ]}
        className="w-full sm:w-64"
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
