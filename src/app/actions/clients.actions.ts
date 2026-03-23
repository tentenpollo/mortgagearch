"use server";

import { getSession } from "@/lib/supabase/server";
import { clientsService } from "@/lib/services/clients.service";
import { auditService } from "@/lib/services/audit.service";
import { createClientSchema, updateClientSchema } from "@/lib/validators";
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

export async function createClientAction(formData: FormData) {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };

  const parsed = createClientSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    const errs = parsed.error.flatten().fieldErrors;
    return {
      error:
        errs.name?.[0] || errs.email?.[0] || errs.phone?.[0] || "Invalid input",
    };
  }

  const clientIp = getClientIp();

  try {
    const client = await clientsService.create(user.id, parsed.data);

    await auditService.log({
      brokerId: user.id,
      clientId: client.id,
      actorType: "BROKER",
      actorId: user.id,
      action: "CLIENT_CREATED",
      details: { name: client.name, email: client.email },
      ipAddress: clientIp,
    });

    revalidatePath("/dashboard/clients");
    revalidatePath("/dashboard");
    return { success: true, clientId: client.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create client";
    if (message.includes("unique") || message.includes("duplicate")) {
      return { error: "A client with this email already exists" };
    }
    return { error: message };
  }
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const user = await getSession();
  if (!user) return { error: "Unauthorized" };

  const parsed = updateClientSchema.safeParse({
    name: formData.get("name") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: "Invalid input" };
  }

  const clientIp = getClientIp();

  const client = await clientsService.update(clientId, user.id, parsed.data);
  if (!client) return { error: "Client not found" };

  await auditService.log({
    brokerId: user.id,
    clientId: client.id,
    actorType: "BROKER",
    actorId: user.id,
    action: "CLIENT_UPDATED",
    details: parsed.data,
    ipAddress: clientIp,
  });

  revalidatePath(`/dashboard/clients/${clientId}`);
  revalidatePath("/dashboard/clients");
  return { success: true };
}
