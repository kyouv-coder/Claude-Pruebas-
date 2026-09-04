import { prisma } from "@/lib/prisma";
import type { BookingStatus } from "@/generated/prisma";

export async function listServices() {
  return prisma.service.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
}

export async function listStaff() {
  return prisma.user.findMany({
    where: { role: "STAFF", active: true },
    orderBy: { name: "asc" },
  });
}

export async function listUpcomingBookings(limit = 50) {
  return prisma.booking.findMany({
    where: { startTime: { gte: new Date() } },
    orderBy: { startTime: "asc" },
    take: limit,
    include: { client: true, service: true, staff: true },
  });
}

export async function findOrCreateClient(input: {
  name: string;
  phone?: string;
  email?: string;
}) {
  const existing = await prisma.client.findFirst({
    where: {
      OR: [
        input.email ? { email: input.email } : undefined,
        input.phone ? { phone: input.phone } : undefined,
      ].filter(Boolean) as object[],
    },
  });
  if (existing) return existing;

  return prisma.client.create({
    data: {
      name: input.name,
      phone: input.phone || null,
      email: input.email || null,
    },
  });
}

export async function createBooking(input: {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceId: string;
  staffId: string;
  startTime: Date;
  notes?: string;
}) {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: input.serviceId },
  });
  const client = await findOrCreateClient({
    name: input.clientName,
    phone: input.clientPhone,
    email: input.clientEmail,
  });
  const endTime = new Date(
    input.startTime.getTime() + service.durationMinutes * 60_000
  );

  return prisma.booking.create({
    data: {
      clientId: client.id,
      serviceId: service.id,
      staffId: input.staffId,
      startTime: input.startTime,
      endTime,
      notes: input.notes || null,
    },
  });
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  return prisma.booking.update({ where: { id }, data: { status } });
}
