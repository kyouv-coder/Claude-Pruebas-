import { prisma } from "@/lib/prisma";
import type { BookingStatus } from "@/generated/prisma";

export async function listServices(businessId: string) {
  return prisma.service.findMany({
    where: { businessId, active: true },
    orderBy: { name: "asc" },
  });
}

export async function listStaff(businessId: string) {
  return prisma.user.findMany({
    where: { businessId, role: "STAFF", active: true },
    orderBy: { name: "asc" },
  });
}

export async function listUpcomingBookings(businessId: string, limit = 50) {
  return prisma.booking.findMany({
    where: { businessId, startTime: { gte: new Date() } },
    orderBy: { startTime: "asc" },
    take: limit,
    include: { client: true, service: true, staff: true },
  });
}

export async function findOrCreateClient(
  businessId: string,
  input: {
    name: string;
    phone?: string;
    email?: string;
  }
) {
  const existing = await prisma.client.findFirst({
    where: {
      businessId,
      OR: [
        input.email ? { email: input.email } : undefined,
        input.phone ? { phone: input.phone } : undefined,
      ].filter(Boolean) as object[],
    },
  });
  if (existing) return existing;

  return prisma.client.create({
    data: {
      businessId,
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
    },
  });
}

export async function createBooking(
  businessId: string,
  input: {
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    serviceId: string;
    staffId: string;
    startTime: Date;
    notes?: string;
  }
) {
  const service = await prisma.service.findFirstOrThrow({
    where: { id: input.serviceId, businessId },
  });
  const client = await findOrCreateClient(businessId, {
    name: input.clientName,
    phone: input.clientPhone,
    email: input.clientEmail,
  });
  const endTime = new Date(
    input.startTime.getTime() + service.durationMinutes * 60_000
  );

  return prisma.booking.create({
    data: {
      businessId,
      clientId: client.id,
      serviceId: service.id,
      staffId: input.staffId,
      startTime: input.startTime,
      endTime,
      notes: input.notes || null,
    },
    include: { client: true, service: true, staff: true },
  });
}

export async function updateBookingStatus(
  businessId: string,
  id: string,
  status: BookingStatus
) {
  return prisma.booking.update({
    where: { id, businessId },
    data: { status },
  });
}
