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
