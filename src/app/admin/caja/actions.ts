"use server";

import { revalidatePath } from "next/cache";
import {
  openCashSession,
  closeCashSession,
  chargeBooking,
  sellGiftCard,
  redeemGiftCard,
} from "@/lib/pos";
import type { PaymentMethod } from "@/generated/prisma";

export type ActionState = { error?: string };

export async function openCashSessionAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const openingAmount = Number(formData.get("openingAmount") || 0);
  if (!(openingAmount >= 0)) {
    return { error: "Ingresá un monto inicial válido." };
  }
  await openCashSession(openingAmount);
  revalidatePath("/admin/caja");
  return {};
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
  await closeCashSession(sessionId, closingAmount);
  revalidatePath("/admin/caja");
  return {};
}

export async function chargeBookingAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  const cashSessionId = String(formData.get("cashSessionId") || "");
  const paymentMethod = String(formData.get("paymentMethod") || "CASH") as PaymentMethod;
  await chargeBooking(bookingId, cashSessionId, paymentMethod);
  revalidatePath("/admin/caja");
  revalidatePath("/admin/dashboard");
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

  if (!clientName) {
    return { error: "Ingresá el nombre del cliente." };
  }
  if (!(amount > 0)) {
    return { error: "El monto debe ser mayor a 0." };
  }

  await sellGiftCard({
    clientName,
    clientPhone: clientPhone || undefined,
    clientEmail: clientEmail || undefined,
    amount,
    paymentMethod,
    cashSessionId,
  });
  revalidatePath("/admin/caja");
  revalidatePath("/admin/dashboard");
  return {};
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

  try {
    await redeemGiftCard({ code, amount, cashSessionId });
  } catch (e) {
    if (e instanceof Error && e.message.includes("Argument `where`")) {
      return { error: "No se encontró ninguna giftcard con ese código." };
    }
    return {
      error: e instanceof Error ? e.message : "No se pudo canjear la giftcard.",
    };
  }
  revalidatePath("/admin/caja");
  revalidatePath("/admin/dashboard");
  return {};
}
