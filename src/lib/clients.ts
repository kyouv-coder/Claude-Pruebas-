import { prisma } from "@/lib/prisma";

export async function listClients(businessId: string) {
  const clients = await prisma.client.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    include: {
      bookings: { select: { id: true, startTime: true, status: true } },
      sales: { select: { total: true, createdAt: true } },
    },
  });

  return clients.map((c) => {
    const totalSpent = c.sales.reduce((sum, s) => sum + Number(s.total), 0);
    // "Visita" = algo que realmente pasó — un turno completado o una
    // venta cobrada. Un turno pendiente/confirmado todavía no ocurrió
    // (mostrar su fecha como "última visita" sería una fecha futura,
    // confuso), y uno cancelado o no-show tampoco fue una visita real.
    const attendedBookings = c.bookings.filter((b) => b.status === "COMPLETED");
    const visitDates = [
      ...attendedBookings.map((b) => b.startTime),
      ...c.sales.map((s) => s.createdAt),
    ];
    const lastVisit =
      visitDates.length > 0
        ? new Date(Math.max(...visitDates.map((d) => d.getTime())))
        : null;

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      bookingsCount: attendedBookings.length,
      totalSpent,
      lastVisit,
    };
  });
}

export async function getClientDetail(businessId: string, id: string) {
  return prisma.client.findFirstOrThrow({
    where: { id, businessId },
    include: {
      bookings: {
        orderBy: { startTime: "desc" },
        include: { service: true, staff: true },
      },
      sales: {
        orderBy: { createdAt: "desc" },
        include: { items: true },
      },
      giftCards: true,
    },
  });
}

export async function listFrequentNoShowClients(businessId: string, minCount = 2) {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const noShows = await prisma.booking.findMany({
    where: { businessId, status: "NO_SHOW", startTime: { gte: ninetyDaysAgo } },
    select: { clientId: true, client: { select: { name: true } } },
  });

  const counts = new Map<string, { name: string; count: number }>();
  for (const b of noShows) {
    const entry = counts.get(b.clientId) ?? { name: b.client.name, count: 0 };
    entry.count += 1;
    counts.set(b.clientId, entry);
  }

  return [...counts.entries()]
    .filter(([, v]) => v.count >= minCount)
    .map(([clientId, v]) => ({ clientId, name: v.name, count: v.count }));
}

export async function updateClientNotes(businessId: string, id: string, notes: string) {
  return prisma.client.update({
    where: { id, businessId },
    data: { notes: notes || null },
  });
}
