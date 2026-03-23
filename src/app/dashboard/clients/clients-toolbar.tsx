"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input, Button, Modal, Textarea } from "@/components/ui";
import { Search, Plus } from "lucide-react";
import { createClientAction } from "@/app/actions/clients.actions";

interface ClientsToolbarProps {
  initialSearch?: string;
}

export function ClientsToolbar({ initialSearch = "" }: ClientsToolbarProps) {
  const router = useRouter();
  const [search, setSearch] = useState(initialSearch);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    startTransition(() => {
      const params = new URLSearchParams();
      if (value) params.set("search", value);
      router.push(`/dashboard/clients?${params.toString()}`);
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createClientAction(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setIsModalOpen(false);
      e.currentTarget.reset();
      router.refresh();
    }
  };

  return (
    <>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search clients by name or email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setIsModalOpen(true)} size="md">
          <Plus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        title="Add New Client"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <Input
            label="Full Name"
            name="name"
            placeholder="John Smith"
            required
            autoFocus
          />

          <Input
            label="Email"
            name="email"
            type="email"
            placeholder="john.smith@example.com"
            required
          />

          <Input
            label="Phone (optional)"
            name="phone"
            type="tel"
            placeholder="(555) 123-4567"
          />

          <Textarea
            label="Notes (optional)"
            name="notes"
            placeholder="Additional information about this client..."
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              Create Client
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
