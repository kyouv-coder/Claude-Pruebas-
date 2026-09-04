"use server";

import { headers } from "next/headers";
import { createBooking } from "@/lib/bookings";
import { checkWithinBusinessHours } from "@/lib/business-hours";
import { prisma } from "@/lib/prisma";
import {
  getBusinessBySlug,
  listPublicStaff,
  checkPublicBookingRateLimit,
  recordPublicBookingAttempt,
} from "@/lib/public-booking";
import { sendSlackNotification } from "@/lib/slack";

export type ActionState = { error?: string; success?: string };

async function getClientIp() {
  const headerList = await headers();
  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwardedFor = headerList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export async function createPublicBookingAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ip = await getClientIp();
  const withinLimit = await checkPublicBookingRateLimit(ip);
  if (!withinLimit) {
    return { error: "Demasiados intentos. Probá de nuevo en un rato, o llamá directamente al negocio." };
  }
  await recordPublicBookingAttempt(ip);

  const slug = String(formData.get("slug") || "");
  const clientName = String(formData.get("clientName") || "").trim();
  const clientPhone = String(formData.get("clientPhone") || "").trim();
  const clientEmail = String(formData.get("clientEmail") || "").trim();
  const serviceId = String(formData.get("serviceId") || "");
  const staffId = String(formData.get("staffId") || "");
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  const notes = String(formData.get("notes") || "").trim();

  if (!clientName) return { error: "Ingresá tu nombre." };
  if (!clientPhone && !clientEmail) {
    return { error: "Dejanos un teléfono o un email para poder contactarte." };
  }
  if (!serviceId) return { error: "Elegí un servicio." };
  if (!date || !time) return { error: "Elegí fecha y hora." };

  const startTime = new Date(`${date}T${time}:00`);
  if (Number.isNaN(startTime.getTime())) {
    return { error: "La fecha u hora ingresada no es válida." };
  }
  if (startTime < new Date()) {
    return { error: "Elegí una fecha y hora futura." };
  }

  const business = await getBusinessBySlug(slug);
  if (!business) {
    return { error: "No se encontró el negocio." };
  }

  const bookingInput = {
    clientName,
    clientPhone: clientPhone || undefined,
    clientEmail: clientEmail || undefined,
    serviceId,
    startTime,
    notes: notes || undefined,
  };

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: business.id },
  });
  if (!service) {
    return { error: "El servicio elegido ya no está disponible." };
  }
  const endTime = new Date(startTime.getTime() + service.durationMinutes * 60_000);
  const hoursCheck = await checkWithinBusinessHours(business.id, startTime, endTime);
  if (!hoursCheck.ok) {
    return { error: hoursCheck.reason };
  }

  try {
    const createOptions = { enforceBusinessHours: true };
    let booking;
    if (staffId) {
      booking = await createBooking(business.id, { ...bookingInput, staffId }, createOptions);
    } else {
      // "Sin preferencia": probamos con cada profesional activo hasta
      // encontrar uno libre en ese horario.
      const staff = await listPublicStaff(business.id);
      if (staff.length === 0) {
        return { error: "No hay profesionales disponibles en este momento." };
      }
      let lastError: Error | null = null;
      for (const s of staff) {
        try {
          booking = await createBooking(business.id, { ...bookingInput, staffId: s.id }, createOptions);
          lastError = null;
          break;
        } catch (e) {
          lastError = e instanceof Error ? e : new Error("Error desconocido");
        }
      }
      if (!booking) {
        throw lastError ?? new Error("No hay horarios disponibles.");
      }
    }

    await sendSlackNotification(
      business.slackWebhookUrl,
      `📅 Nueva reserva online: *${booking.client.name}* — ${booking.service.name} con ${booking.staff.name}, ${booking.startTime.toLocaleString("es-AR", {
        dateStyle: "short",
        timeStyle: "short",
      })}`
    );

    return {
      success: `¡Listo! Tu ${business.copy.bookingSingular} quedó agendada para el ${booking.startTime.toLocaleString("es-AR", { dateStyle: "full", timeStyle: "short" })}.`,
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "No se pudo crear la reserva. Probá con otro horario.",
    };
  }
}
