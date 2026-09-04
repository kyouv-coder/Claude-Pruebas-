"use server";

import { revalidatePath } from "next/cache";
import { createBooking, updateBookingStatus } from "@/lib/bookings";

export type ActionState = { error?: string };

export async function createBookingAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const clientName = String(formData.get("clientName") || "").trim();
  const clientPhone = String(formData.get("clientPhone") || "").trim();
  const clientEmail = String(formData.get("clientEmail") || "").trim();
  const serviceId = String(formData.get("serviceId") || "");
  const staffId = String(formData.get("staffId") || "");
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  const notes = String(formData.get("notes") || "").trim();

  if (!clientName || !serviceId || !staffId || !date || !time) {
    return { error: "Completá cliente, servicio, profesional, fecha y hora." };
  }

  const startTime = new Date(`${date}T${time}:00`);
  if (Number.isNaN(startTime.getTime())) {
    return { error: "La fecha u hora ingresada no es válida." };
  }

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
  return {};
}

export async function cancelBookingAction(bookingId: string) {
  await updateBookingStatus(bookingId, "CANCELLED");
  revalidatePath("/admin/reservas");
}
