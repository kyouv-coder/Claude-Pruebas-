"use server";

import { revalidatePath } from "next/cache";
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
  await updateClientNotes(businessId, id, notes);
  revalidatePath(`/admin/clientes/${id}`);
  return { success: "Notas guardadas." };
}
