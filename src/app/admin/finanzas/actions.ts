"use server";

import { revalidatePath } from "next/cache";
import { createExpense, deleteExpense } from "@/lib/finance";
import { requireAdmin } from "@/lib/auth";
import type { ExpenseCategory } from "@/generated/prisma";

export type ActionState = { error?: string; success?: string };

const VALID_CATEGORIES: ExpenseCategory[] = [
  "IMPUESTOS",
  "ALQUILER",
  "INSUMOS",
  "SUELDOS",
  "SERVICIOS",
  "OTRO",
];

export async function createExpenseAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const dateRaw = String(formData.get("date") || "");
  const category = String(formData.get("category") || "") as ExpenseCategory;
  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount") || 0);

  const date = new Date(`${dateRaw}T12:00:00`);
  if (!dateRaw || Number.isNaN(date.getTime())) {
    return { error: "Ingresá una fecha válida." };
  }
  if (!VALID_CATEGORIES.includes(category)) {
    return { error: "Elegí una categoría." };
  }
  if (!(amount > 0)) {
    return { error: "El monto debe ser mayor a 0." };
  }

  const businessId = await requireAdmin();

  await createExpense(businessId, {
    date,
    category,
    description: description || undefined,
    amount,
  });

  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/dashboard");
  return { success: "Gasto registrado." };
}

export async function deleteExpenseAction(id: string) {
  const businessId = await requireAdmin();
  await deleteExpense(businessId, id);
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/dashboard");
}
