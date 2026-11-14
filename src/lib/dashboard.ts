import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";

const WORK_MINUTES_PER_STAFF_DAY = 8 * 60;

type DailySalesRow = { day: Date; revenue: Prisma.Decimal };
type ServiceCountRow = { serviceId: string; name: string; count: bigint };

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
    salesLast30Agg,
    salesLast7Agg,
    dailySalesRows,
    outstandingGiftCards,
    bookingsLast30,
    topServiceRows,
  ] = await Promise.all([
    prisma.user.count({ where: { businessId, role: "STAFF", active: true } }),
    // Solo se usa el estado y la duración del servicio de cada turno de hoy
    // (para la ocupación) — antes se traía el turno y el servicio completos.
    prisma.booking.findMany({
      where: { businessId, startTime: { gte: today, lt: tomorrow } },
      select: { status: true, service: { select: { durationMinutes: true } } },
    }),
    prisma.sale.aggregate({
      where: { businessId, createdAt: { gte: last30 } },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.sale.aggregate({
      where: { businessId, createdAt: { gte: last7 } },
      _sum: { total: true },
    }),
    // Tendencia diaria de ingresos: la suma por día la hace Postgres
    // (date_trunc + GROUP BY) en vez de recorrer en JS cada venta de los
    // últimos 30 días para acumularla en un mapa por fecha.
    prisma.$queryRaw<DailySalesRow[]>`
      SELECT date_trunc('day', "createdAt") AS day, SUM(total) AS revenue
      FROM "Sale"
      WHERE "businessId" = ${businessId} AND "createdAt" >= ${last30}
      GROUP BY day
    `,
    prisma.giftCard.aggregate({
      // Igual que getGiftCardStats (giftcards.ts): una giftcard vencida
      // sigue "active" en la base (nada la desactiva sola al pasar la
      // fecha) pero ya no se puede canjear — sin este mismo filtro acá,
      // el saldo pendiente del dashboard quedaba sobreestimado respecto
      // al que muestra la propia página de Giftcards.
      where: {
        businessId,
        active: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      _sum: { balance: true },
    }),
    // Solo se usa el estado de cada turno (ratios de cancelación/no-show) —
    // el ranking de servicios se calcula aparte con su propio GROUP BY.
    prisma.booking.findMany({
      where: { businessId, startTime: { gte: last30 } },
      select: { status: true },
    }),
    // El ranking de servicios más solicitados lo agrupa y ordena Postgres,
    // y solo se traen los 5 primeros — antes se traía un turno por fila de
    // los últimos 30 días (con el nombre del servicio incluido) solo para
    // contarlos y ordenarlos en JS.
    prisma.$queryRaw<ServiceCountRow[]>`
      SELECT b."serviceId", s.name, COUNT(*) AS count
      FROM "Booking" b
      JOIN "Service" s ON s.id = b."serviceId"
      WHERE b."businessId" = ${businessId} AND b."startTime" >= ${last30}
      GROUP BY b."serviceId", s.name
      ORDER BY count DESC
      LIMIT 5
    `,
  ]);

  // Ingresos y ticket promedio
  const revenueLast30 = Number(salesLast30Agg._sum.total ?? 0);
  const salesLast30Count = salesLast30Agg._count._all;
  const revenueLast7 = Number(salesLast7Agg._sum.total ?? 0);
  const ticketPromedio = salesLast30Count > 0 ? revenueLast30 / salesLast30Count : 0;

  // Tendencia diaria de ingresos, en dos ventanas (14 y 30 días) para que el
  // selector de período del dashboard pueda alternar sin otra consulta.
  const revenueByDay = new Map<string, number>();
  for (const row of dailySalesRows) {
    revenueByDay.set(startOfDay(row.day).toISOString().slice(0, 10), Number(row.revenue));
  }
  function dailyTrend(days: number) {
    const map = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const key = daysAgo(i).toISOString().slice(0, 10);
      map.set(key, revenueByDay.get(key) ?? 0);
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
  const topServices = topServiceRows.map((r) => ({
    name: r.name,
    count: Number(r.count),
  }));

  return {
    hasActivity: bookingsLast30.length > 0 || salesLast30Count > 0,
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
