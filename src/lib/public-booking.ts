import { prisma } from "@/lib/prisma";
import { getVerticalCopy } from "@/lib/verticals";

export async function getBusinessBySlug(slug: string) {
  const business = await prisma.business.findUnique({ where: { slug } });
  if (!business) return null;
  return { ...business, copy: getVerticalCopy(business.businessType) };
}

export async function listPublicServices(businessId: string) {
  return prisma.service.findMany({
    where: { businessId, active: true },
    orderBy: { name: "asc" },
  });
}

export async function listPublicStaff(businessId: string) {
  return prisma.user.findMany({
    where: { businessId, role: "STAFF", active: true },
    orderBy: { name: "asc" },
  });
}

const BOOKING_WINDOW_MINUTES = 60;
const BOOKING_MAX_ATTEMPTS = 8;

// Mismo patrón que el rate limit de signup: guardado en DB porque cada
// invocación serverless puede correr en una instancia distinta.
export async function checkPublicBookingRateLimit(ip: string) {
  const windowStart = new Date(Date.now() - BOOKING_WINDOW_MINUTES * 60_000);
  const recentAttempts = await prisma.publicBookingAttempt.count({
    where: { ip, createdAt: { gte: windowStart } },
  });
  return recentAttempts < BOOKING_MAX_ATTEMPTS;
}

export async function recordPublicBookingAttempt(ip: string) {
  await prisma.publicBookingAttempt.create({ data: { ip } });
}

// Franjas ya ocupadas de un profesional en un día puntual, para mostrarle
// al cliente qué evitar antes de que envíe el formulario (en vez de que se
// entere recién con el error de solapamiento al confirmar).
export async function listBusyRanges(businessId: string, staffId: string, dateStr: string) {
  const dayStart = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(dayStart.getTime())) return [];
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60_000);

  const bookings = await prisma.booking.findMany({
    where: {
      businessId,
      staffId,
      status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
      startTime: { lt: dayEnd },
      endTime: { gt: dayStart },
    },
    orderBy: { startTime: "asc" },
    select: { startTime: true, endTime: true },
  });

  return bookings.map((b) => ({
    start: b.startTime.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    end: b.endTime.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
  }));
}
