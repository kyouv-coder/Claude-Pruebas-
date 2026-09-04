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

export async function openCashSessionAction(formData: FormData) {
  const openingAmount = Number(formData.get("openingAmount") || 0);
  await openCashSession(openingAmount);
  revalidatePath("/admin/caja");
}

export async function closeCashSessionAction(formData: FormData) {
  const sessionId = String(formData.get("sessionId") || "");
  const closingAmount = Number(formData.get("closingAmount") || 0);
  await closeCashSession(sessionId, closingAmount);
  revalidatePath("/admin/caja");
}

export async function chargeBookingAction(formData: FormData) {
  const bookingId = String(formData.get("bookingId") || "");
  const cashSessionId = String(formData.get("cashSessionId") || "");
  const paymentMethod = String(formData.get("paymentMethod") || "CASH") as PaymentMethod;
  await chargeBooking(bookingId, cashSessionId, paymentMethod);
  revalidatePath("/admin/caja");
  revalidatePath("/admin/dashboard");
}

export async function sellGiftCardAction(formData: FormData) {
  const cashSessionId = String(formData.get("cashSessionId") || "");
  const clientName = String(formData.get("clientName") || "").trim();
  const clientPhone = String(formData.get("clientPhone") || "").trim();
  const clientEmail = String(formData.get("clientEmail") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const paymentMethod = String(formData.get("paymentMethod") || "CASH") as PaymentMethod;

  if (!clientName || amount <= 0) {
    throw new Error("Faltan datos para vender la giftcard");
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
}

export async function redeemGiftCardAction(formData: FormData) {
  const cashSessionId = String(formData.get("cashSessionId") || "");
  const code = String(formData.get("code") || "").trim().toUpperCase();
  const amount = Number(formData.get("amount") || 0);

  if (!code || amount <= 0) {
    throw new Error("Faltan datos para canjear la giftcard");
  }

  await redeemGiftCard({ code, amount, cashSessionId });
  revalidatePath("/admin/caja");
  revalidatePath("/admin/dashboard");
}
