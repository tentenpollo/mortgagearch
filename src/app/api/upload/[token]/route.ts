import { NextRequest, NextResponse } from "next/server";
import { tokensService } from "@/lib/services/tokens.service";
import { documentsService } from "@/lib/services/documents.service";
import { storageService } from "@/lib/services/storage.service";
import { auditService } from "@/lib/services/audit.service";

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

interface RouteParams {
  params: Promise<{ token: string }>;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "unknown";
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const clientIp = getClientIp(request);
    const { token } = await params;

    // Validate token
    const validation = await tokensService.validateToken(token);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.reason },
        { status: 403 }
      );
    }

    const { client, uploadToken } = validation;

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Please upload PDF, images, or Word documents." },
        { status: 400 }
      );
    }

    // Sanitize filename - remove special characters for security
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    
    // Create unique storage path: clients/{clientId}/{timestamp}_{filename}
    const timestamp = Date.now();
    const storagePath = `clients/${client.id}/${timestamp}_${sanitizedFilename}`;

    // Convert file to buffer for Vercel Blob
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Vercel Blob
    const storedUrl = await storageService.upload(
      storagePath,
      buffer,
      file.type || "application/octet-stream"
    );

    // Create document record
    const document = await documentsService.createFromUpload({
      clientId: client.id,
      uploadTokenId: uploadToken.id,
      originalFilename: file.name,
      mimeType: file.type || "application/octet-stream",
      fileSizeBytes: file.size,
      storedUrl,
    });

    // Increment token upload count
    await tokensService.incrementUploadCount(uploadToken.id);

    // Log upload audit entry
    await auditService.log({
      brokerId: uploadToken.brokerId,
      clientId: client.id,
      documentId: document.id,
      actorType: "BORROWER",
      actorId: client.id,
      action: "DOCUMENT_UPLOADED",
      details: {
        filename: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadTokenId: uploadToken.id,
      },
      ipAddress: clientIp,
    });

    // Auto-transition: UPLOADED → PROCESSING
    await documentsService.updateStatus(document.id, "PROCESSING");
    await auditService.log({
      brokerId: uploadToken.brokerId,
      clientId: client.id,
      documentId: document.id,
      actorType: "SYSTEM",
      actorId: "system",
      action: "DOCUMENT_PROCESSING",
      details: { automatic: true },
      ipAddress: clientIp,
    });

    // Auto-transition: PROCESSING → PENDING_REVIEW
    await documentsService.updateStatus(document.id, "PENDING_REVIEW");
    await auditService.log({
      brokerId: uploadToken.brokerId,
      clientId: client.id,
      documentId: document.id,
      actorType: "SYSTEM",
      actorId: "system",
      action: "DOCUMENT_READY_FOR_REVIEW",
      details: { automatic: true },
      ipAddress: clientIp,
    });

    return NextResponse.json({
      success: true,
      documentId: document.id,
      filename: file.name,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 }
    );
  }
}

// Disable body parsing to handle multipart form data
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
