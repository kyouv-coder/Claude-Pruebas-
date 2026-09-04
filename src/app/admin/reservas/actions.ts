"use server";

import { revalidatePath } from "next/cache";
import { createBooking, updateBookingStatus } from "@/lib/bookings";
import { requireBusinessId, getCurrentUser } from "@/lib/auth";
import { sendSlackNotification } from "@/lib/slack";

export type ActionState = { error?: string; success?: string };

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

  const businessId = await requireBusinessId();

  let booking;
  try {
    booking = await createBooking(businessId, {
      clientName,
      clientPhone: clientPhone || undefined,
      clientEmail: clientEmail || undefined,
      serviceId,
      staffId,
      startTime,
      notes: notes || undefined,
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo crear la reserva." };
  }

  const user = await getCurrentUser();
  await sendSlackNotification(
    user?.business.slackWebhookUrl,
    `📅 Nueva reserva: *${booking.client.name}* — ${booking.service.name} con ${booking.staff.name}, ${booking.startTime.toLocaleString("es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    })}`
  );

  revalidatePath("/admin/reservas");
  return { success: "Reserva creada." };
}

export async function cancelBookingAction(bookingId: string) {
  const businessId = await requireBusinessId();
  await updateBookingStatus(businessId, bookingId, "CANCELLED");
  revalidatePath("/admin/reservas");
}

export async function markNoShowAction(bookingId: string) {
  const businessId = await requireBusinessId();
  await updateBookingStatus(businessId, bookingId, "NO_SHOW");
  revalidatePath("/admin/reservas");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/clientes");
}
