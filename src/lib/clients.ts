import { prisma } from "@/lib/prisma";

export async function listClients(businessId: string) {
  const clients = await prisma.client.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    include: {
      bookings: { select: { id: true, startTime: true } },
      sales: { select: { total: true, createdAt: true } },
    },
  });

  return clients.map((c) => {
    const totalSpent = c.sales.reduce((sum, s) => sum + Number(s.total), 0);
    const visitDates = [
      ...c.bookings.map((b) => b.startTime),
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
      bookingsCount: c.bookings.length,
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

export async function updateClientNotes(businessId: string, id: string, notes: string) {
  return prisma.client.update({
    where: { id, businessId },
    data: { notes: notes || null },
  });
}
