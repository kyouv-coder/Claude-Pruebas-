"use server";

import { revalidatePath } from "next/cache";
import { createBooking, updateBookingStatus } from "@/lib/bookings";

export async function createBookingAction(formData: FormData) {
  const clientName = String(formData.get("clientName") || "").trim();
  const clientPhone = String(formData.get("clientPhone") || "").trim();
  const clientEmail = String(formData.get("clientEmail") || "").trim();
  const serviceId = String(formData.get("serviceId") || "");
  const staffId = String(formData.get("staffId") || "");
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  const notes = String(formData.get("notes") || "").trim();

  if (!clientName || !serviceId || !staffId || !date || !time) {
    throw new Error("Faltan campos obligatorios");
  }

  const startTime = new Date(`${date}T${time}:00`);

  await createBooking({
    clientName,
    clientPhone: clientPhone || undefined,
    clientEmail: clientEmail || undefined,
    serviceId,
    staffId,
    startTime,
    notes: notes || undefined,
  });

  revalidatePath("/admin/reservas");
}

export async function cancelBookingAction(bookingId: string) {
  await updateBookingStatus(bookingId, "CANCELLED");
  revalidatePath("/admin/reservas");
}
