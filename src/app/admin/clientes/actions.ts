"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { updateClientNotes } from "@/lib/clients";
import { requireBusinessId } from "@/lib/auth";

export type ActionState = { error?: string; success?: string };

export async function updateClientNotesAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const id = String(formData.get("id") || "");
  const notes = String(formData.get("notes") || "").trim();

  const businessId = await requireBusinessId();
  try {
    await updateClientNotes(businessId, id, notes);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { error: "No se encontró el cliente." };
    }
    throw e;
  }
  revalidatePath(`/admin/clientes/${id}`);
  return { success: "Notas guardadas." };
}
