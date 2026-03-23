"use server";

import { getSession } from "@/lib/supabase/server";
import { documentsService } from "@/lib/services/documents.service";
import { auditService } from "@/lib/services/audit.service";
import { approveDocumentSchema, rejectDocumentSchema } from "@/lib/validators";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

function getClientIp(): string {
  const headersList = headers();
  const forwarded = headersList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return headersList.get("x-real-ip") || "unknown";
}

export async function approveDocumentAction(documentId: string, formData: FormData) {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };

  const parsed = approveDocumentSchema.safeParse({
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: "Invalid input" };
  }

    const clientIp = getClientIp();

    try {
      // Get document and verify broker ownership through client relationship
      const docData = await documentsService.getById(documentId);
      if (!docData) return { error: "Document not found" };

      const { document, client } = docData;
      if (client.brokerId !== user.id) return { error: "Unauthorized" };

      // Check if document was already reviewed
      const wasReviewed = document.reviewedAt !== null;

      // Approve document
      const updated = await documentsService.approve(
        documentId,
        user.id,
        parsed.data.notes
      );

      if (!updated) {
        return { error: "Document not in PENDING_REVIEW status" };
      }

      // Log audit entry (mark if this is a change to existing review)
      await auditService.log({
        brokerId: user.id,
        clientId: client.id,
        documentId,
        actorType: "BROKER",
        actorId: user.id,
        action: "DOCUMENT_APPROVED",
        details: {
          notes: parsed.data.notes,
          previousDecision: wasReviewed ? document.reviewDecision : null,
          reviewChanged: wasReviewed,
        },
        ipAddress: clientIp,
      });

    revalidatePath(`/dashboard/documents/${documentId}`);
    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to approve document";
    return { error: message };
  }
}

export async function rejectDocumentAction(documentId: string, formData: FormData) {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };

  const parsed = rejectDocumentSchema.safeParse({
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors;
    return { error: errs.reason?.[0] || "Rejection reason is required" };
  }

  const clientIp = getClientIp();

  try {
    // Get document and verify broker ownership through client relationship
    const docData = await documentsService.getById(documentId);
    if (!docData) return { error: "Document not found" };

    const { document, client } = docData;
    if (client.brokerId !== user.id) return { error: "Unauthorized" };

    // Check if document was already reviewed
    const wasReviewed = document.reviewedAt !== null;

    // Reject document
    const updated = await documentsService.reject(
      documentId,
      user.id,
      parsed.data.reason
    );

    if (!updated) {
      return { error: "Document not in PENDING_REVIEW status" };
    }

    // Log audit entry (mark if this is a change to existing review)
    await auditService.log({
      brokerId: user.id,
      clientId: client.id,
      documentId,
      actorType: "BROKER",
      actorId: user.id,
      action: "DOCUMENT_REJECTED",
      details: {
        reason: parsed.data.reason,
        previousDecision: wasReviewed ? document.reviewDecision : null,
        reviewChanged: wasReviewed,
      },
      ipAddress: clientIp,
    });

    revalidatePath(`/dashboard/documents/${documentId}`);
    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to reject document";
    return { error: message };
  }
}

export async function changeReviewAction(
  documentId: string,
  newDecision: "APPROVED" | "REJECTED",
  formData: FormData
) {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };

  const clientIp = getClientIp();

  try {
    // Get document and verify broker ownership
    const docData = await documentsService.getById(documentId);
    if (!docData) return { error: "Document not found" };

    const { document, client } = docData;
    if (client.brokerId !== user.id) return { error: "Unauthorized" };

    // Document must already be reviewed (APPROVED or REJECTED)
    if (!document.reviewedAt || document.status === "PENDING_REVIEW") {
      return { error: "Document has not been reviewed yet" };
    }

    // First, move document back to PENDING_REVIEW
    await documentsService.updateStatus(documentId, "PENDING_REVIEW");

    // Then apply the new decision
    if (newDecision === "APPROVED") {
      const notes = formData.get("notes") as string;
      await documentsService.approve(documentId, user.id, notes);

      await auditService.log({
        brokerId: user.id,
        clientId: client.id,
        documentId,
        actorType: "BROKER",
        actorId: user.id,
        action: "DOCUMENT_APPROVED",
        details: {
          notes,
          previousDecision: document.reviewDecision,
          reviewChanged: true,
        },
        ipAddress: clientIp,
      });
    } else {
      const reason = formData.get("reason") as string;
      if (!reason) return { error: "Rejection reason is required" };

      await documentsService.reject(documentId, user.id, reason);

      await auditService.log({
        brokerId: user.id,
        clientId: client.id,
        documentId,
        actorType: "BROKER",
        actorId: user.id,
        action: "DOCUMENT_REJECTED",
        details: {
          reason,
          previousDecision: document.reviewDecision,
          reviewChanged: true,
        },
        ipAddress: clientIp,
      });
    }

    revalidatePath(`/dashboard/documents/${documentId}`);
    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to change review";
    return { error: message };
  }
}
