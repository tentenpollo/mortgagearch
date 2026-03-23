"use client";

import { useState } from "react";
import { Button, Card, CardContent } from "@/components/ui";
import { Upload, FileText, X, CheckCircle, AlertCircle } from "lucide-react";
import { formatFileSize } from "@/lib/utils";

interface UploadFormProps {
  token: string;
  clientName: string;
  uploadLabel: string | null;
}

interface UploadedFile {
  file: File;
  id: string;
}

// Compliance constraints for mortgage documents
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".heic", ".doc", ".docx"];

export function UploadForm({ token, clientName, uploadLabel }: UploadFormProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState(0);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (max ${formatFileSize(MAX_FILE_SIZE)})`;
    }
    
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `File type not allowed. Please upload: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }

    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return `File type not allowed. Please upload: ${ALLOWED_EXTENSIONS.join(", ")}`;
    }

    return null;
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const newFiles: UploadedFile[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        newFiles.push({ file, id: Math.random().toString(36) });
      }
    });

    if (errors.length > 0) {
      setErrorMessage(errors.join("\n"));
    } else {
      setErrorMessage(null);
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;

    setUploadStatus("uploading");
    setErrorMessage(null);

    let uploaded = 0;

    for (const { file } of files) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const response = await fetch(`/api/upload/${token}`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Upload failed");
        }

        uploaded++;
      } catch (err) {
        setUploadStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Upload failed");
        return;
      }
    }

    setSuccessCount(uploaded);
    setUploadStatus("success");
    setFiles([]);
  };

  if (uploadStatus === "success") {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="text-center py-12">
          <CheckCircle className="h-16 w-16 mx-auto text-green-600 mb-4" />
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">
            Upload Successful!
          </h2>
          <p className="text-slate-600 mb-6">
            {successCount} file{successCount !== 1 ? "s" : ""} uploaded successfully.
            Your documents will be reviewed shortly.
          </p>
          <Button onClick={() => setUploadStatus("idle")}>
            Upload More Files
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="py-8">
        <form onSubmit={handleSubmit}>
          {/* Drag & Drop Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative rounded-xl border-2 border-dashed transition-all
              ${isDragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-slate-50"}
              ${uploadStatus === "uploading" ? "pointer-events-none opacity-50" : ""}
            `}
          >
            <input
              type="file"
              id="file-input"
              multiple
              accept={ALLOWED_EXTENSIONS.join(",")}
              onChange={(e) => handleFiles(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploadStatus === "uploading"}
            />
            <div className="py-12 px-6 text-center">
              <Upload className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <p className="text-base font-medium text-slate-900 mb-1">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-slate-500">
                PDF, JPG, PNG, HEIC, DOC, DOCX • Max {formatFileSize(MAX_FILE_SIZE)} per file
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mt-4 rounded-lg bg-red-50 p-4 flex items-start gap-3 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 whitespace-pre-line">{errorMessage}</p>
            </div>
          )}

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-slate-700 mb-3">
                Files to upload ({files.length})
              </p>
              {files.map(({ file, id }) => (
                <div
                  key={id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(id)}
                    className="flex-shrink-0 p-1 rounded hover:bg-slate-200 transition-colors"
                    disabled={uploadStatus === "uploading"}
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Submit Button */}
          {files.length > 0 && (
            <Button
              type="submit"
              className="w-full mt-6"
              size="lg"
              loading={uploadStatus === "uploading"}
              disabled={uploadStatus === "uploading"}
            >
              {uploadStatus === "uploading"
                ? "Uploading..."
                : `Upload ${files.length} File${files.length !== 1 ? "s" : ""}`}
            </Button>
          )}

          {/* Security Notice */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Your files are encrypted and securely transmitted. All uploads are logged and monitored for compliance.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
