import { prisma } from "@/lib/prisma";
import type { BookingStatus } from "@/generated/prisma";
import { checkWithinBusinessHours } from "@/lib/business-hours";

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
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return prisma.booking.findMany({
    // Incluye desde el inicio de hoy (no solo desde "ahora") para que un
    // turno de esta mañana que nunca se cobró siga visible y se pueda
    // marcar como no-show, en vez de desaparecer de la lista sin más.
    where: { businessId, startTime: { gte: startOfToday } },
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
  },
  options?: { enforceBusinessHours?: boolean }
) {
  const service = await prisma.service.findFirstOrThrow({
    where: { id: input.serviceId, businessId },
  });
  const endTime = new Date(
    input.startTime.getTime() + service.durationMinutes * 60_000
  );

  if (options?.enforceBusinessHours) {
    const hoursCheck = await checkWithinBusinessHours(businessId, input.startTime, endTime);
    if (!hoursCheck.ok) {
      throw new Error(hoursCheck.reason);
    }
  }

  // Evita doble reserva: ¿el mismo profesional ya tiene un turno que se
  // superpone con este horario? (dos intervalos se solapan si uno
  // empieza antes de que el otro termine, en ambos sentidos)
  const conflict = await prisma.booking.findFirst({
    where: {
      businessId,
      staffId: input.staffId,
      status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
      startTime: { lt: endTime },
      endTime: { gt: input.startTime },
    },
  });
  if (conflict) {
    throw new Error("Ese profesional ya tiene un turno reservado en ese horario.");
  }

  const client = await findOrCreateClient(businessId, {
    name: input.clientName,
    phone: input.clientPhone,
    email: input.clientEmail,
  });

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
