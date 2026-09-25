"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import { createExpense, deleteExpense, attachSaleInvoice } from "@/lib/finance";
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
  // Mismo motivo que las notas de cliente/reserva y la dirección del negocio:
  // este campo de texto libre no tenía ningún tope.
  if (description.length > 500) {
    return { error: "La descripción es demasiado larga (máximo 500 caracteres)." };
  }
  // Number.isFinite, no solo > 0: "Infinity" pasa Number("Infinity") > 0,
  // y guardar eso en un campo Decimal tira un PrismaClientValidationError
  // sin capturar más abajo — rompía la página entera.
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "El monto debe ser un número mayor a 0." };
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
  try {
    await deleteExpense(businessId, id);
  } catch (e) {
    // Un doble clic en "Eliminar" (o dos pestañas) puede mandar el borrado
    // dos veces: la segunda ya no encuentra el gasto (P2025). El resultado
    // que el usuario quería (que el gasto no exista) ya está logrado, así
    // que no hace falta romper la página con el error genérico de Next.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      revalidatePath("/admin/finanzas");
      revalidatePath("/admin/dashboard");
      return;
    }
    throw e;
  }
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/dashboard");
}

export async function uploadSaleInvoiceAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const saleId = String(formData.get("saleId") || "");
  const file = formData.get("file");

  if (!saleId) {
    return { error: "Venta inválida." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Elegí un archivo para subir." };
  }

  const businessId = await requireAdmin();
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await attachSaleInvoice(businessId, saleId, {
      name: file.name,
      type: file.type,
      data: buffer,
    });
  } catch (e) {
    // attachSaleInvoice hace un findFirstOrThrow de la venta — un P2025 acá
    // (saleId inválido) relayaba el texto verboso de Prisma en vez de un
    // mensaje entendible, mismo caso ya corregido en otras acciones.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { error: "No se encontró la venta." };
    }
    return { error: e instanceof Error ? e.message : "No se pudo subir el comprobante." };
  }

  revalidatePath("/admin/finanzas");
  return { success: "Comprobante subido." };
}
