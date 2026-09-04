import { prisma } from "@/lib/prisma";

const WORK_MINUTES_PER_STAFF_DAY = 8 * 60;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysAgo(n: number) {
  const d = startOfDay(new Date());
  d.setDate(d.getDate() - n);
  return d;
}

export async function getDashboardStats(businessId: string) {
  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const last30 = daysAgo(30);
  const last7 = daysAgo(7);

  const [
    activeStaffCount,
    todaysBookings,
    last30Sales,
    outstandingGiftCards,
    bookingsLast30,
  ] = await Promise.all([
    prisma.user.count({ where: { businessId, role: "STAFF", active: true } }),
    prisma.booking.findMany({
      where: { businessId, startTime: { gte: today, lt: tomorrow } },
      include: { service: true },
    }),
    prisma.sale.findMany({
      where: { businessId, createdAt: { gte: last30 } },
      select: { total: true, createdAt: true },
    }),
    prisma.giftCard.aggregate({
      where: { businessId, active: true },
      _sum: { balance: true },
    }),
    prisma.booking.findMany({
      where: { businessId, startTime: { gte: last30 } },
      select: { status: true, service: { select: { name: true } } },
    }),
  ]);

  // Ingresos y ticket promedio
  const revenueLast30 = last30Sales.reduce((sum, s) => sum + Number(s.total), 0);
  const revenueLast7 = last30Sales
    .filter((s) => s.createdAt >= last7)
    .reduce((sum, s) => sum + Number(s.total), 0);
  const ticketPromedio =
    last30Sales.length > 0 ? revenueLast30 / last30Sales.length : 0;

  // Tendencia diaria de ingresos, en dos ventanas (14 y 30 días) para que el
  // selector de período del dashboard pueda alternar sin otra consulta.
  function dailyTrend(days: number) {
    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      map.set(daysAgo(i).toISOString().slice(0, 10), 0);
    }
    for (const sale of last30Sales) {
      const key = startOfDay(sale.createdAt).toISOString().slice(0, 10);
      if (map.has(key)) {
        map.set(key, (map.get(key) ?? 0) + Number(sale.total));
      }
    }
    return Array.from(map.entries()).map(([date, revenue]) => ({ date, revenue }));
  }
  const revenueTrend = dailyTrend(14);
  const revenueTrend30 = dailyTrend(30);

  // Proyección simple: promedio diario de los últimos 14 días * 30
  const avgDailyRevenue =
    revenueTrend.reduce((sum, d) => sum + d.revenue, 0) / revenueTrend.length;
  const projectedRevenueNext30 = Math.round(avgDailyRevenue * 30);

  // Ocupación de hoy
  const bookedMinutesToday = todaysBookings
    .filter((b) => b.status !== "CANCELLED")
    .reduce((sum, b) => sum + b.service.durationMinutes, 0);
  const availableMinutesToday = Math.max(
    activeStaffCount * WORK_MINUTES_PER_STAFF_DAY,
    1
  );
  const occupancyRateToday = Math.min(
    bookedMinutesToday / availableMinutesToday,
    1
  );

  // Ratios de cancelación / no-show (últimos 30 días)
  const total30 = bookingsLast30.length || 1;
  const cancelledCount = bookingsLast30.filter(
    (b) => b.status === "CANCELLED"
  ).length;
  const noShowCount = bookingsLast30.filter(
    (b) => b.status === "NO_SHOW"
  ).length;
  const cancellationRate = cancelledCount / total30;
  const noShowRate = noShowCount / total30;

  // Servicios más solicitados (últimos 30 días)
  const serviceCounts = new Map<string, number>();
  for (const b of bookingsLast30) {
    serviceCounts.set(
      b.service.name,
      (serviceCounts.get(b.service.name) ?? 0) + 1
    );
  }
  const topServices = Array.from(serviceCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    hasActivity: bookingsLast30.length > 0 || last30Sales.length > 0,
    todaysBookingsCount: todaysBookings.filter((b) => b.status !== "CANCELLED")
      .length,
    revenueLast7,
    revenueLast30,
    ticketPromedio,
    occupancyRateToday,
    cancellationRate,
    noShowRate,
    outstandingGiftCardBalance: Number(
      outstandingGiftCards._sum.balance ?? 0
    ),
    revenueTrend,
    revenueTrend30,
    projectedRevenueNext30,
    topServices,
  };
}
