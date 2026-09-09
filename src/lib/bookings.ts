import { Prisma } from "@/generated/prisma";
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
    include: {
      client: true,
      service: true,
      staff: true,
      productRequests: { include: { product: true } },
    },
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
    productRequests?: { productId: string; quantity: number }[];
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

  const client = await findOrCreateClient(businessId, {
    name: input.clientName,
    phone: input.clientPhone,
    email: input.clientEmail,
  });

  const validRequests = (input.productRequests || []).filter((r) => r.quantity > 0);
  if (validRequests.length > 0) {
    const products = await prisma.product.findMany({
      where: { businessId, active: true, id: { in: validRequests.map((r) => r.productId) } },
      select: { id: true, stock: true },
    });
    // La cantidad viene de un formulario público sin autenticar — el
    // frontend ya la limita al stock, pero eso es solo UX, no protege
    // nada. Sin este clamp acá, alguien podía pedir 9999 unidades de un
    // producto con 2 en stock y esa cifra le quedaba en la nota al staff.
    const stockById = new Map(products.map((p) => [p.id, p.stock]));
    validRequests.splice(
      0,
      validRequests.length,
      ...validRequests
        .filter((r) => stockById.has(r.productId))
        .map((r) => ({ ...r, quantity: Math.min(r.quantity, stockById.get(r.productId)!) }))
        .filter((r) => r.quantity > 0)
    );
  }

  const runAttempt = () =>
    prisma.$transaction(
      async (tx) => {
        const conflict = await tx.booking.findFirst({
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

        return tx.booking.create({
          data: {
            businessId,
            clientId: client.id,
            serviceId: service.id,
            staffId: input.staffId,
            startTime: input.startTime,
            endTime,
            notes: input.notes || null,
            productRequests:
              validRequests.length > 0
                ? {
                    create: validRequests.map((r) => ({
                      productId: r.productId,
                      quantity: r.quantity,
                    })),
                  }
                : undefined,
          },
          include: {
            client: true,
            service: true,
            staff: true,
            productRequests: { include: { product: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

  // Chequeo de conflicto + creación en una sola transacción serializable:
  // sin esto, dos reservas simultáneas para el mismo profesional/horario
  // (dos clientes reservando el mismo slot al mismo tiempo desde la página
  // pública) podían pasar ambas el chequeo antes de que ninguna hubiera
  // insertado todavía, y terminar dobladas. Serializable hace que Postgres
  // detecte ese solapamiento de escrituras y una de las dos transacciones
  // falle con P2034 — pero esa detección (SSI) puede dar falsos positivos
  // entre transacciones que en realidad no se solapan, así que reintentamos
  // antes de asumir que es un conflicto real: al reintentar, un conflicto
  // genuino vuelve a fallar de forma determinística con el error de
  // negocio de arriba (la otra reserva ya quedó confirmada en la DB), y uno
  // falso simplemente se resuelve solo.
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await runAttempt();
    } catch (e) {
      const isSerializationFailure =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
      if (!isSerializationFailure || attempt === MAX_ATTEMPTS) {
        if (isSerializationFailure) {
          throw new Error("Ese profesional ya tiene un turno reservado en ese horario.");
        }
        throw e;
      }
    }
  }
  throw new Error("No se pudo crear la reserva, intentá de nuevo.");
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
