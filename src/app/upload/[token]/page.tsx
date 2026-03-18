"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Card, buttonClassName, cn } from "@/components/ui/primitives";

interface UploadItem {
  id: string;
  file: File;
  status: "queued" | "uploading" | "success" | "error";
  message?: string;
}

const MAX_FILES_PER_BATCH = 10;

function isAllowedType(file: File) {
  const allowedTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/tiff",
  ];
  return allowedTypes.includes(file.type);
}

function isAllowedSize(file: File) {
  return file.size <= 20 * 1024 * 1024;
}

export default function UploadPage() {
  const { token } = useParams<{ token: string }>();
  const tokenInfoAbortRef = useRef<AbortController | null>(null);
  const tokenInfoFetchIdRef = useRef(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [tokenInfo, setTokenInfo] = useState<{
    clientName?: string;
    reason?: string | null;
  } | null>(null);
  const [tokenInfoLoading, setTokenInfoLoading] = useState(true);

  useEffect(() => {
    const fetchTokenInfo = async () => {
      const fetchId = tokenInfoFetchIdRef.current + 1;
      tokenInfoFetchIdRef.current = fetchId;

      tokenInfoAbortRef.current?.abort();
      const controller = new AbortController();
      tokenInfoAbortRef.current = controller;

      setTokenInfoLoading(true);
      try {
        const res = await fetch(`/api/upload/${token}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (fetchId !== tokenInfoFetchIdRef.current || controller.signal.aborted) {
          return;
        }

        if (data.success) {
          setTokenInfo(data.data);
        }
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setTokenInfo(null);
      } finally {
        if (fetchId === tokenInfoFetchIdRef.current) {
          setTokenInfoLoading(false);
        }
      }
    };

    fetchTokenInfo();

    return () => {
      tokenInfoAbortRef.current?.abort();
    };
  }, [token]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFiles = useCallback((incomingFiles: FileList | File[]) => {
    const filesArray = Array.from(incomingFiles);

    setQueue((prev) => {
      const existingKeySet = new Set(
        prev.map(
          (item) =>
            `${item.file.name}-${item.file.size}-${item.file.lastModified}`,
        ),
      );

      const availableSlots = Math.max(0, MAX_FILES_PER_BATCH - prev.length);
      const nextFiles: UploadItem[] = [];

      for (const file of filesArray) {
        if (nextFiles.length >= availableSlots) break;

        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (existingKeySet.has(key)) continue;

        const allowedType = isAllowedType(file);
        const allowedSize = isAllowedSize(file);

        nextFiles.push({
          id: `${crypto.randomUUID()}`,
          file,
          status: allowedType && allowedSize ? "queued" : "error",
          message: !allowedType
            ? "Unsupported file type. Use PDF, JPEG, PNG, WebP, or TIFF."
            : !allowedSize
              ? "File is too large. Maximum size is 20 MB."
              : undefined,
        });

        existingKeySet.add(key);
      }

      return [...prev, ...nextFiles];
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
      }
      e.target.value = "";
    },
    [processFiles],
  );

  const uploadSingle = async (item: UploadItem) => {
    setQueue((prev) =>
      prev.map((it) =>
        it.id === item.id
          ? { ...it, status: "uploading", message: undefined }
          : it,
      ),
    );

    try {
      const formData = new FormData();
      formData.append("file", item.file);

      const res = await fetch(`/api/upload/${token}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setQueue((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: "success",
                  message: "Uploaded successfully",
                }
              : it,
          ),
        );
      } else {
        setQueue((prev) =>
          prev.map((it) =>
            it.id === item.id
              ? {
                  ...it,
                  status: "error",
                  message: data.error?.message ?? "Upload failed",
                }
              : it,
          ),
        );
      }
    } catch {
      setQueue((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? {
                ...it,
                status: "error",
                message: "Network error. Please try again.",
              }
            : it,
        ),
      );
    }
  };
  function getFirstName(fullName: string) {
    return fullName.split(" ")[0];
  }

  const handleUploadAll = async () => {
    const pendingItems = queue.filter(
      (item) => item.status === "queued" || item.status === "error",
    );
    if (pendingItems.length === 0) return;

    setUploading(true);
    for (const item of pendingItems) {
      await uploadSingle(item);
    }
    setUploading(false);
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== "success"));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const stats = useMemo(() => {
    const queued = queue.filter((q) => q.status === "queued").length;
    const success = queue.filter((q) => q.status === "success").length;
    const error = queue.filter((q) => q.status === "error").length;
    const uploadingCount = queue.filter((q) => q.status === "uploading").length;
    return { queued, success, error, uploading: uploadingCount };
  }, [queue]);

  return (
    <div className="page-frame flex items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-3xl space-y-6">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-brand-100 bg-white px-4 py-2 text-sm font-semibold text-brand-700 shadow-sm">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-white">
              M
            </span>
            MortgageArch secure upload
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            {tokenInfoLoading
              ? "Upload your documents"
              : tokenInfo?.clientName
                ? `Hello, ${getFirstName(tokenInfo.clientName)}!`
                : "Upload your documents"}
          </h1>
          {!tokenInfoLoading && tokenInfo?.reason ? (
            <p className="text-sm text-slate-600">
              Upload your {tokenInfo.reason.toLowerCase()}.
            </p>
          ) : (
            <p className="text-sm text-slate-600">
              Upload one or more documents for your broker to review.
            </p>
          )}
        </div>

        <Card className="card-pad">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
            className={cn(
              "cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
              dragActive
                ? "border-brand-500 bg-brand-50"
                : "border-slate-300 bg-slate-50 hover:border-brand-300 hover:bg-brand-50/40",
            )}
          >
            <input
              id="file-input"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff,.tif"
              multiple
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-700 shadow-sm">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
              </div>
              <div>
                <p className="text-lg font-semibold text-slate-950">
                  Choose files to upload
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Click or drag and drop. Up to {MAX_FILES_PER_BATCH} files,
                  20MB each.
                </p>
              </div>
            </div>
          </div>

          {queue.length > 0 ? (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="rounded-full bg-slate-100 px-2 py-1">
                    {stats.queued} queued
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                    {stats.success} uploaded
                  </span>
                  <span className="rounded-full bg-red-100 px-2 py-1 text-red-700">
                    {stats.error} failed
                  </span>
                  {stats.uploading > 0 ? (
                    <span className="rounded-full bg-brand-100 px-2 py-1 text-brand-700">
                      {stats.uploading} uploading
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleClearCompleted}
                    className={buttonClassName("ghost")}
                    disabled={uploading || stats.success === 0}
                  >
                    Clear uploaded
                  </button>
                  <button
                    onClick={handleUploadAll}
                    disabled={
                      uploading || (stats.queued === 0 && stats.error === 0)
                    }
                    className={buttonClassName("primary")}
                  >
                    {uploading
                      ? "Uploading..."
                      : `Upload ${stats.queued + stats.error} file(s)`}
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">File</th>
                      <th className="px-4 py-3 font-medium">Size</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {queue.map((item) => (
                      <tr key={item.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 text-slate-800">
                          {item.file.name}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {formatFileSize(item.file.size)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-1 text-xs font-medium",
                              item.status === "queued" &&
                                "bg-slate-100 text-slate-700",
                              item.status === "uploading" &&
                                "bg-brand-100 text-brand-700",
                              item.status === "success" &&
                                "bg-emerald-100 text-emerald-700",
                              item.status === "error" &&
                                "bg-red-100 text-red-700",
                            )}
                          >
                            {item.status === "queued" && "Queued"}
                            {item.status === "uploading" && "Uploading"}
                            {item.status === "success" && "Uploaded"}
                            {item.status === "error" && "Failed"}
                          </span>
                          {item.message ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {item.message}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            disabled={uploading || item.status === "uploading"}
                            className="text-sm font-medium text-slate-500 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
