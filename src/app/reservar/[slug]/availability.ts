"use server";

import { getBusinessBySlug, listBusyRanges } from "@/lib/public-booking";
import { getBusinessHours, hasConfiguredHours } from "@/lib/business-hours";
import { logUnexpectedError } from "@/lib/log";

export async function getBusyTimesAction(slug: string, staffId: string, date: string) {
  if (!staffId || !date) return [];
  try {
    const business = await getBusinessBySlug(slug);
    if (!business) return [];
    return listBusyRanges(business.id, staffId, date);
  } catch (e) {
    // Igual que el resto de las ~25 acciones que atrapan errores
    // inesperados (un corte de conexión a la DB, por ejemplo): el caller
    // en PublicBookingForm.tsx ya hace .catch(() => setBusyRanges([])),
    // así que sin este log el error se perdía en silencio en vez de
    // aparecer en Sentry/los logs del server.
    logUnexpectedError(e);
    return [];
  }
}

export type DayAvailability =
  | { configured: false }
  | { configured: true; closed: true }
  | { configured: true; closed: false; openTime: string; closeTime: string };

export async function getDayAvailabilityAction(slug: string, date: string): Promise<DayAvailability> {
  if (!date) return { configured: false };
  // Esta acción es un server action expuesto directamente (cualquiera puede
  // llamarla con un string arbitrario, no solo desde el <input type="date">
  // que la invoca normalmente) — mismo motivo que ya hace listBusyRanges
  // (lib/public-booking.ts) con este mismo patrón de fecha. Sin este
  // chequeo, una fecha inválida da un Invalid Date cuyo getDay() es NaN:
  // hours[NaN] es undefined, y leer day.closed más abajo explota con un
  // TypeError no atrapado en vez de devolver una respuesta vacía.
  const parsedDate = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return { configured: false };

  try {
    const business = await getBusinessBySlug(slug);
    if (!business) return { configured: false };

    const configured = await hasConfiguredHours(business.id);
    if (!configured) return { configured: false };

    const dayOfWeek = parsedDate.getDay();
    const hours = await getBusinessHours(business.id);
    const day = hours[dayOfWeek];
    if (day.closed) return { configured: true, closed: true };
    return { configured: true, closed: false, openTime: day.openTime, closeTime: day.closeTime };
  } catch (e) {
    // Mismo motivo que getBusyTimesAction arriba: el caller en
    // PublicBookingForm.tsx ya hace .catch(() => setDayAvailability(null)),
    // así que sin este log un error inesperado de DB se perdía en silencio.
    logUnexpectedError(e);
    return { configured: false };
  }
}
