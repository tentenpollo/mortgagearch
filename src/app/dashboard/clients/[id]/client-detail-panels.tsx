"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Modal, Input, Badge, Card, CardContent } from "@/components/ui";
import { Link2, Copy, Check, Ban, Plus, Calendar, Upload } from "lucide-react";
import { createTokenAction, revokeTokenAction } from "@/app/actions/tokens.actions";
import { formatDateTime, formatDate } from "@/lib/utils";
import { env } from "@/lib/env";

interface UploadToken {
  id: string;
  token: string;
  label: string | null;
  maxUploads: number | null;
  uploadCount: number;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

interface ClientDetailPanelsProps {
  clientId: string;
  clientName: string;
  tokens: UploadToken[];
}

export function ClientDetailPanels({
  clientId,
  clientName,
  tokens,
}: ClientDetailPanelsProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleCreateToken = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createTokenAction(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setIsModalOpen(false);
      e.currentTarget.reset();
      router.refresh();
    }
  };

  const handleRevoke = async (tokenId: string) => {
    if (!confirm("Are you sure you want to revoke this upload link? It cannot be used anymore.")) {
      return;
    }

    startTransition(async () => {
      const result = await revokeTokenAction(tokenId);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const copyToClipboard = async (token: string) => {
    const url = `${env.NEXT_PUBLIC_APP_URL}/upload/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getTokenStatus = (token: UploadToken) => {
    if (token.revokedAt) return { label: "Revoked", color: "gray" as const };
    if (token.expiresAt && new Date() > token.expiresAt)
      return { label: "Expired", color: "yellow" as const };
    if (token.maxUploads && token.uploadCount >= token.maxUploads)
      return { label: "Limit Reached", color: "red" as const };
    return { label: "Active", color: "green" as const };
  };

  return (
    <>
      {/* Upload Tokens Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Upload Links</h2>
          <Button onClick={() => setIsModalOpen(true)} size="sm">
            <Plus className="h-3.5 w-3.5" />
            Generate Link
          </Button>
        </div>

        {tokens.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Link2 className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">
                No upload links yet. Create one to allow {clientName} to upload documents.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {tokens.map((token) => {
              const status = getTokenStatus(token);
              const isCopied = copiedToken === token.token;
              const isActive = status.label === "Active";

              return (
                <Card key={token.id}>
                  <CardContent>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900">
                            {token.label || "Upload Link"}
                          </p>
                          <Badge color={status.color}>{status.label}</Badge>
                        </div>
                        
                        <div className="mt-2 space-y-1 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Upload className="h-3 w-3" />
                            <span>
                              {token.uploadCount} upload{token.uploadCount !== 1 ? "s" : ""}
                              {token.maxUploads && ` of ${token.maxUploads}`}
                            </span>
                          </div>
                          
                          {token.expiresAt && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3 w-3" />
                              <span>Expires {formatDate(token.expiresAt)}</span>
                            </div>
                          )}
                          
                          <div className="text-2xs text-slate-400">
                            Created {formatDateTime(token.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => copyToClipboard(token.token)}
                          disabled={!isActive}
                        >
                          {isCopied ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Copy Link
                            </>
                          )}
                        </Button>
                        
                        {isActive && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRevoke(token.id)}
                            disabled={isPending}
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Token Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setError(null);
        }}
        title="Generate Upload Link"
      >
        <form onSubmit={handleCreateToken} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 border border-red-200">
              {error}
            </div>
          )}

          <input type="hidden" name="clientId" value={clientId} />

          <Input
            label="Link Label"
            name="label"
            placeholder="e.g., Tax Documents 2024"
            required
            autoFocus
          />

          <Input
            label="Max Uploads (optional)"
            name="maxUploads"
            type="number"
            min="1"
            placeholder="Leave empty for unlimited"
          />

          <Input
            label="Expires In (hours, optional)"
            name="expiresInHours"
            type="number"
            min="1"
            placeholder="Leave empty for no expiration"
          />

          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
            The client will receive a secure link they can use to upload documents directly to their profile.
          </div>

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
              Generate Link
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
