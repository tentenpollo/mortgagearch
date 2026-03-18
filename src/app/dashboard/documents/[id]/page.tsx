"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  LoadingState,
  PageHeader,
  SectionHeading,
  StatusBadge,
  buttonClassName,
  cn,
} from "@/components/ui/primitives";
import { getDocumentStatus } from "@/lib/ui";

function getAuthHeaders() {
  return { Authorization: `Basic ${btoa("admin:admin123")}` };
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ValidationIssue = {
  field: string;
  severity: string;
  message: string;
};

type AiResult = {
  documentType?: string;
  confidence?: number;
  extractedFields?: Record<string, unknown>;
  validation?: { isValid?: boolean; issues?: ValidationIssue[] };
  reasoning?: string;
} | null;

function canPreviewInline(mimeType: string | undefined) {
  if (!mimeType) return false;
  if (mimeType.startsWith("image/")) return true;
  return mimeType === "application/pdf";
}

export default function DocumentReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [doc, setDoc] = useState<Record<string, unknown> | null>(null);
  const [client, setClient] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [approveNotes, setApproveNotes] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/documents/${id}`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success) {
          setDoc(data.data.documents ?? data.data);
          setClient(data.data.clients ?? data.data.client ?? null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleApprove = async () => {
    setActionLoading("approve");
    try {
      const res = await fetch(`/api/documents/${id}/approve`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ notes: approveNotes || undefined }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/dashboard");
      } else {
        alert(data.error?.message ?? "Approve failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading("reject");
    try {
      const res = await fetch(`/api/documents/${id}/reject`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (data.success) {
        router.push("/dashboard");
      } else {
        alert(data.error?.message ?? "Reject failed");
      }
    } catch {
      alert("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <LoadingState label="Loading document details..." />;
  }

  if (!doc) {
    return (
      <Card className="card-pad">
        <div className="space-y-3 py-8 text-center">
          <p className="text-lg font-semibold text-slate-950">Document not found</p>
          <p className="text-sm text-slate-600">The requested file could not be loaded.</p>
          <div>
            <Link href="/dashboard" className={buttonClassName("secondary")}>
              Back to queue
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  const aiResult = doc.aiResult as AiResult;
  const status = getDocumentStatus(doc.status as string | undefined);
  const isReviewable = (doc.status as string) === "PENDING_REVIEW";
  const originalFilename = doc.originalFilename as string;
  const validationIssues = aiResult?.validation?.issues ?? [];
  const confidence = aiResult?.confidence ?? 0;
  const ocrConfidence = typeof doc.ocrConfidence === "number" ? (doc.ocrConfidence as number) : null;
  const ocrText = typeof doc.ocrText === "string" ? (doc.ocrText as string) : "";
  const mimeType = typeof doc.mimeType === "string" ? (doc.mimeType as string) : undefined;
  const storedPath = typeof doc.storedPath === "string" ? (doc.storedPath as string) : null;
  const inlinePreview = canPreviewInline(mimeType);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Review"
        title={originalFilename}
        description={client ? `Client: ${String(client.name)} | Uploaded ${formatDate(doc.createdAt as string)}` : `Uploaded ${formatDate(doc.createdAt as string)}`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <Link href="/dashboard" className={buttonClassName("secondary")}>
              Back to queue
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <Card className="card-pad">
            <SectionHeading title="File details" description="Metadata captured at upload time." />
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Filename</dt>
                <dd className="text-right font-medium text-slate-900">{originalFilename}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Type</dt>
                <dd className="text-right text-slate-700">{doc.mimeType as string}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Size</dt>
                <dd className="text-right text-slate-700">{formatSize(doc.fileSizeBytes as number)}</dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Uploaded</dt>
                <dd className="text-right text-slate-700">{formatDate(doc.createdAt as string)}</dd>
              </div>
            </dl>
            {storedPath ? (
              <div className="mt-5 text-xs text-slate-500">Secure preview available below. Direct file download link hidden in this view.</div>
            ) : null}
          </Card>

          {storedPath ? (
            <Card className="card-pad">
              <SectionHeading title="Original document preview" description="Inline viewer for broker review without exposing a direct download action." />
              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {inlinePreview ? (
                  <iframe
                    title="Original document preview"
                    src={`${storedPath}#toolbar=0&navpanes=0&scrollbar=1`}
                    className="h-[640px] w-full"
                  />
                ) : (
                  <div className="p-5 text-sm text-slate-600">
                    Inline preview is not supported for this file type.
                  </div>
                )}
              </div>
            </Card>
          ) : null}

          {ocrConfidence !== null ? (
            <Card className="card-pad">
              <SectionHeading title="OCR confidence" description="Signal quality from the document text extraction pass." />
              <div className="mt-5 flex items-center gap-4">
                <div className="progress-track flex-1">
                  <div className="progress-fill" style={{ width: `${ocrConfidence * 100}%` }} />
                </div>
                <span className="w-14 text-right text-sm font-semibold text-slate-900">{(ocrConfidence * 100).toFixed(0)}%</span>
              </div>
            </Card>
          ) : null}

          <Card className="card-pad">
            <SectionHeading title="Docling OCR text" description="Text extracted by Docling for AI classification and broker verification." />
            {ocrText ? (
              <pre className="mt-5 max-h-[420px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-800 whitespace-pre-wrap break-words">
                {ocrText}
              </pre>
            ) : (
              <p className="mt-5 text-sm text-slate-600">OCR text is not available yet for this file.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="card-pad">
            <SectionHeading title="AI classification" description="Detected type, confidence, and reasoning from the AI pipeline." />
            {aiResult ? (
              <div className="mt-5 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm text-slate-500">Document type</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">
                      {aiResult.documentType?.replace(/_/g, " ") ?? "Unknown"}
                    </p>
                  </div>
                  <StatusBadge tone={confidence > 0.8 ? "success" : confidence > 0.5 ? "warning" : "danger"}>
                    {(confidence * 100).toFixed(0)}% confidence
                  </StatusBadge>
                </div>

                <div>
                  <div className="progress-track">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        confidence > 0.8 ? "bg-emerald-500" : confidence > 0.5 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${confidence * 100}%` }}
                    />
                  </div>
                </div>

                {aiResult.reasoning ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {aiResult.reasoning}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-600">AI classification is not available yet for this file.</p>
            )}
          </Card>

          {aiResult?.extractedFields && Object.keys(aiResult.extractedFields).length > 0 ? (
            <Card className="card-pad">
              <SectionHeading title="Extracted fields" description="Structured values inferred from the uploaded document." />
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {Object.entries(aiResult.extractedFields).map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </dt>
                    <dd className="mt-2 text-sm leading-6 text-slate-900">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}

          {validationIssues.length > 0 ? (
            <Card className="card-pad border-amber-200 bg-amber-50/50">
              <SectionHeading title="Validation issues" description="Problems flagged by the AI validation pass." />
              <ul className="mt-5 space-y-3">
                {validationIssues.map((issue, index) => (
                  <li key={`${issue.field}-${index}`} className="rounded-2xl border border-amber-200 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge tone={issue.severity === "ERROR" ? "danger" : issue.severity === "WARNING" ? "warning" : "info"}>
                        {issue.severity}
                      </StatusBadge>
                      <p className="text-sm font-medium text-slate-900">{issue.field}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{issue.message}</p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>

      {isReviewable ? (
        <Card className="card-pad border-brand-100 bg-brand-50/40">
          <SectionHeading title="Broker decision" description="Approve the document for filing or reject it with a clear reason." />
          {!showReject ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Approval notes</label>
                <textarea
                  value={approveNotes}
                  onChange={(e) => setApproveNotes(e.target.value)}
                  className="textarea"
                  placeholder="Add optional notes for the filing record."
                />
              </div>
              <div className="flex flex-wrap gap-3 lg:flex-col">
                <button
                  onClick={handleApprove}
                  disabled={!!actionLoading}
                  className={buttonClassName(
                    "primary",
                    "group w-full lg:min-w-44 transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm"
                  )}
                >
                  <svg
                    className={cn("h-4 w-4 transition-transform", actionLoading === "approve" ? "animate-spin" : "group-hover:scale-110")}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {actionLoading === "approve" ? "Approving..." : "Approve and file"}
                </button>
                <button
                  onClick={() => setShowReject(true)}
                  className={buttonClassName(
                    "danger",
                    "group w-full lg:min-w-44 transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm"
                  )}
                >
                  <svg className="h-4 w-4 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Rejection reason</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="textarea"
                  placeholder="Explain why this document should be rejected."
                  required
                />
              </div>
              <div className="flex flex-wrap gap-3 lg:flex-col">
                <button
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || !!actionLoading}
                  className={buttonClassName(
                    "danger",
                    "group w-full lg:min-w-44 transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm"
                  )}
                >
                  <svg
                    className={cn("h-4 w-4 transition-transform", actionLoading === "reject" ? "animate-spin" : "group-hover:scale-110")}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                  {actionLoading === "reject" ? "Rejecting..." : "Confirm rejection"}
                </button>
                <button onClick={() => setShowReject(false)} className={buttonClassName("secondary", "w-full lg:min-w-44")}>
                  Back
                </button>
              </div>
            </div>
          )}
        </Card>
      ) : null}
    </div>
  );
}
