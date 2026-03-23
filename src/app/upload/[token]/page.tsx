import { tokensService } from "@/lib/services/tokens.service";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui";
import { AlertCircle, Lock } from "lucide-react";
import { UploadForm } from "./upload-form";

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function UploadPage({ params }: PageProps) {
  const { token } = await params;

  const validation = await tokensService.validateToken(token);

  if (!validation.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <AlertCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">
              Invalid Upload Link
            </h1>
            <p className="text-slate-600 mb-4">
              {validation.reason}
            </p>
            <p className="text-sm text-slate-500">
              Please contact your mortgage broker for a valid upload link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { client, uploadToken } = validation;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-slate-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-brand-100 mb-4">
            <Lock className="h-8 w-8 text-brand-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Secure Document Upload
          </h1>
          <p className="text-lg text-slate-600 mb-1">
            Upload documents for {client.name}
          </p>
          {uploadToken.label && (
            <p className="text-sm text-slate-500">
              {uploadToken.label}
            </p>
          )}
        </div>

        {/* Upload Form */}
        <UploadForm
          token={token}
          clientName={client.name}
          uploadLabel={uploadToken.label}
        />

        {/* Upload Info */}
        {(uploadToken.maxUploads || uploadToken.expiresAt) && (
          <div className="mt-6 text-center text-sm text-slate-500">
            {uploadToken.maxUploads && (
              <p>
                {uploadToken.maxUploads - uploadToken.uploadCount} upload
                {uploadToken.maxUploads - uploadToken.uploadCount !== 1 ? "s" : ""} remaining
              </p>
            )}
            {uploadToken.expiresAt && (
              <p>
                Link expires on {new Date(uploadToken.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-slate-400">
            MortgageArch — Secure Document Management Platform
          </p>
        </div>
      </div>
    </div>
  );
}
