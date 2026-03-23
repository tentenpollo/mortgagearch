"use server";

import { getSession } from "@/lib/supabase/server";
import { tokensService } from "@/lib/services/tokens.service";
import { auditService } from "@/lib/services/audit.service";
import { createTokenSchema } from "@/lib/validators";
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

export async function createTokenAction(formData: FormData) {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };

  const parsed = createTokenSchema.safeParse({
    clientId: formData.get("clientId"),
    label: formData.get("label"),
    maxUploads: formData.get("maxUploads") ? Number(formData.get("maxUploads")) : undefined,
    expiresInHours: formData.get("expiresInHours") ? Number(formData.get("expiresInHours")) : undefined,
  });

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors;
    return {
      error: errs.clientId?.[0] || errs.label?.[0] || "Invalid input",
    };
  }

  const clientIp = getClientIp();

  const token = await tokensService.create({
    clientId: parsed.data.clientId,
    brokerId: user.id,
    label: parsed.data.label,
    maxUploads: parsed.data.maxUploads,
    expiresInHours: parsed.data.expiresInHours,
  });

  await auditService.log({
    brokerId: user.id,
    clientId: parsed.data.clientId,
    actorType: "BROKER",
    actorId: user.id,
    action: "TOKEN_CREATED",
    details: { tokenId: token.id, label: token.label },
    ipAddress: clientIp,
  });

  revalidatePath(`/dashboard/clients/${parsed.data.clientId}`);
  return { success: true, token: token.token };
}

export async function revokeTokenAction(tokenId: string) {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };

  const clientIp = getClientIp();

  const token = await tokensService.revoke(tokenId, user.id);
  if (!token) return { error: "Token not found or already revoked" };

  await auditService.log({
    brokerId: user.id,
    clientId: token.clientId,
    actorType: "BROKER",
    actorId: user.id,
    action: "TOKEN_REVOKED",
    details: { tokenId: token.id },
    ipAddress: clientIp,
  });

  revalidatePath(`/dashboard/clients/${token.clientId}`);
  return { success: true };
}
