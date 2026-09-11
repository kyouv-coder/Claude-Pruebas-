"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma";
import {
  openCashSession,
  closeCashSession,
  chargeBooking,
  sellGiftCard,
  redeemGiftCard,
  sellProduct,
} from "@/lib/pos";
import { requireBusinessId } from "@/lib/auth";
import type { PaymentMethod } from "@/generated/prisma";

export type ActionState = { error?: string; success?: string };

export async function openCashSessionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const openingAmount = Number(formData.get("openingAmount") || 0);
  if (!(openingAmount >= 0)) {
    return { error: "Ingresá un monto inicial válido." };
  }
  const businessId = await requireBusinessId();
  try {
    await openCashSession(businessId, openingAmount);
  } catch (e) {
    revalidatePath("/admin/caja");
    return {
      error: e instanceof Error ? e.message : "No se pudo abrir la caja.",
    };
  }
  revalidatePath("/admin/caja");
  return { success: "Caja abierta." };
}

export async function closeCashSessionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const sessionId = String(formData.get("sessionId") || "");
  const closingAmount = Number(formData.get("closingAmount") || 0);
  if (!(closingAmount >= 0)) {
    return { error: "Ingresá un monto de cierre válido." };
  }
  const businessId = await requireBusinessId();
  let result;
  try {
    result = await closeCashSession(businessId, sessionId, closingAmount);
  } catch (e) {
    revalidatePath("/admin/caja");
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { error: "No se encontró una caja abierta con ese ID." };
    }
    return {
      error: e instanceof Error ? e.message : "No se pudo cerrar la caja.",
    };
  }
  revalidatePath("/admin/caja");

  const money = (n: number) =>
    n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });

  if (result.difference === 0) {
    return { success: `Caja cerrada. Cuadra exacto: ${money(result.countedCash)}.` };
  }
  const sign = result.difference > 0 ? "sobrante" : "faltante";
  return {
    success: `Caja cerrada. Esperado: ${money(result.expectedCash)}, contado: ${money(
      result.countedCash
    )} — ${sign} de ${money(Math.abs(result.difference))}.`,
  };
}

export async function chargeBookingAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const bookingId = String(formData.get("bookingId") || "");
  const cashSessionId = String(formData.get("cashSessionId") || "");
  const paymentMethod = String(formData.get("paymentMethod") || "CASH") as PaymentMethod;
  const businessId = await requireBusinessId();

  try {
    await chargeBooking(businessId, bookingId, cashSessionId, paymentMethod);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2025") {
        return { error: "No se encontró la reserva." };
      }
      // Sale.bookingId es único: un doble clic o dos pestañas cobrando el
      // mismo turno a la vez cae acá en vez de tirar la página entera.
      if (e.code === "P2002") {
        return { error: "Este turno ya fue cobrado." };
      }
    }
    return {
      error: e instanceof Error ? e.message : "No se pudo registrar el cobro.",
    };
  }
  revalidatePath("/admin/caja");
  revalidatePath("/admin/dashboard");
  return { success: "Cobro registrado." };
}

export async function sellGiftCardAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const cashSessionId = String(formData.get("cashSessionId") || "");
  const clientName = String(formData.get("clientName") || "").trim();
  const clientPhone = String(formData.get("clientPhone") || "").trim();
  const clientEmail = String(formData.get("clientEmail") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const paymentMethod = String(formData.get("paymentMethod") || "CASH") as PaymentMethod;
  const expiresAtRaw = String(formData.get("expiresAt") || "").trim();

  if (!clientName) {
    return { error: "Ingresá el nombre del cliente." };
  }
  if (!(amount > 0)) {
    return { error: "El monto debe ser mayor a 0." };
  }
  let expiresAt: Date | undefined;
  if (expiresAtRaw) {
    const parsed = new Date(`${expiresAtRaw}T23:59:59`);
    if (Number.isNaN(parsed.getTime())) {
      return { error: "La fecha de vencimiento no es válida." };
    }
    expiresAt = parsed;
  }

  const businessId = await requireBusinessId();

  await sellGiftCard(businessId, {
    clientName,
    clientPhone: clientPhone || undefined,
    clientEmail: clientEmail || undefined,
    amount,
    paymentMethod,
    cashSessionId,
    expiresAt,
  });
  revalidatePath("/admin/caja");
  revalidatePath("/admin/dashboard");
  return { success: "Giftcard vendida." };
}

export async function sellProductAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const cashSessionId = String(formData.get("cashSessionId") || "");
  const productId = String(formData.get("productId") || "");
  const quantity = Number(formData.get("quantity") || 0);
  const paymentMethod = String(formData.get("paymentMethod") || "CASH") as PaymentMethod;

  if (!productId) {
    return { error: "Elegí un producto." };
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { error: "La cantidad debe ser un número entero mayor a 0." };
  }

  const businessId = await requireBusinessId();

  try {
    await sellProduct(businessId, { productId, quantity, paymentMethod, cashSessionId });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { error: "No se encontró el producto." };
    }
    return {
      error: e instanceof Error ? e.message : "No se pudo registrar la venta.",
    };
  }
  revalidatePath("/admin/caja");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/configuracion");
  return { success: "Producto vendido." };
}

export async function redeemGiftCardAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const cashSessionId = String(formData.get("cashSessionId") || "");
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const amount = Number(formData.get("amount") || 0);

  if (!code) {
    return { error: "Ingresá el código de la giftcard." };
  }
  if (!(amount > 0)) {
    return { error: "El monto debe ser mayor a 0." };
  }

  const businessId = await requireBusinessId();

  try {
    await redeemGiftCard(businessId, { code, amount, cashSessionId });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { error: "No se encontró ninguna giftcard con ese código." };
    }
    return {
      error: e instanceof Error ? e.message : "No se pudo canjear la giftcard.",
    };
  }
  revalidatePath("/admin/caja");
  revalidatePath("/admin/dashboard");
  return { success: "Giftcard canjeada." };
}
