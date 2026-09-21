import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { getDashboardStats } from "./dashboard";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("getDashboardStats", () => {
  let businessId: string;
  let staffId: string;
  let serviceId: string;
  let clientId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test Dashboard Business", businessType: "SPA", slug: `test-dashboard-${Date.now()}` },
    });
    businessId = business.id;

    const staff = await prisma.user.create({
      data: {
        businessId,
        name: "Staff Test",
        email: `staff-dashboard-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "STAFF",
      },
    });
    staffId = staff.id;

    // Servicio de 240 min: con un solo staff activo (480 min/día
    // disponibles), un turno de hoy ocupa exactamente el 50%.
    const service = await prisma.service.create({
      data: { businessId, name: "Servicio Largo", durationMinutes: 240, price: 5000 },
    });
    serviceId = service.id;

    const client = await prisma.client.create({ data: { businessId, name: "Cliente Test" } });
    clientId = client.id;
  });

  afterAll(async () => {
    await prisma.giftCard.deleteMany({ where: { businessId } });
    await prisma.saleItem.deleteMany({ where: { sale: { businessId } } });
    await prisma.sale.deleteMany({ where: { businessId } });
    await prisma.cashRegisterSession.deleteMany({ where: { businessId } });
    await prisma.booking.deleteMany({ where: { businessId } });
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.client.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("reports no activity and zero occupancy for a business with nothing booked", async () => {
    const stats = await getDashboardStats(businessId);
    expect(stats.hasActivity).toBe(false);
    expect(stats.occupancyRateToday).toBe(0);
    expect(stats.todaysBookingsCount).toBe(0);
  });

  it("computes today's occupancy from active staff capacity and non-cancelled bookings", async () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0);
    const end = new Date(start.getTime() + 240 * 60_000);

    await prisma.booking.create({
      data: { businessId, clientId, serviceId, staffId, startTime: start, endTime: end, status: "CONFIRMED" },
    });
    // Un turno cancelado hoy no debería sumar a la ocupación.
    const cancelledStart = new Date(start.getTime() + 5 * 60 * 60_000);
    await prisma.booking.create({
      data: {
        businessId,
        clientId,
        serviceId,
        staffId,
        startTime: cancelledStart,
        endTime: new Date(cancelledStart.getTime() + 240 * 60_000),
        status: "CANCELLED",
      },
    });

    const stats = await getDashboardStats(businessId);
    expect(stats.hasActivity).toBe(true);
    expect(stats.todaysBookingsCount).toBe(1);
    // 240 min ocupados / (1 staff * 480 min disponibles) = 0.5
    expect(stats.occupancyRateToday).toBeCloseTo(0.5, 5);
  });

  it("computes cancellation and no-show rates over the last 30 days", async () => {
    const base = new Date(Date.now() - 3 * 24 * 60 * 60_000);
    const statuses: Array<"COMPLETED" | "CANCELLED" | "NO_SHOW"> = [
      "COMPLETED",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ];
    for (let i = 0; i < statuses.length; i++) {
      const start = new Date(base.getTime() + i * 60 * 60_000);
      await prisma.booking.create({
        data: {
          businessId,
          clientId,
          serviceId,
          staffId,
          startTime: start,
          endTime: new Date(start.getTime() + 30 * 60_000),
          status: statuses[i],
        },
      });
    }

    const stats = await getDashboardStats(businessId);
    // Se suman a los del test anterior (1 CONFIRMED + 1 CANCELLED de hoy),
    // así que el conteo total en la ventana de 30 días es 6.
    expect(stats.cancellationRate).toBeCloseTo(2 / 6, 5);
    expect(stats.noShowRate).toBeCloseTo(1 / 6, 5);
  });

  it("computes revenueLast7/revenueLast30 and ticketPromedio, and ranks topServices by booking count", async () => {
    const operator = await prisma.user.create({
      data: {
        businessId,
        name: "Admin Test Dashboard",
        email: `admin-dashboard-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    const session = await prisma.cashRegisterSession.create({
      data: { businessId, openedById: operator.id, openingAmount: 0 },
    });

    // Una venta reciente (dentro de los últimos 7 días) y otra vieja (fuera
    // de esa ventana pero dentro de los últimos 30) — revenueLast7 debe
    // contar solo la primera, revenueLast30 las dos.
    await prisma.sale.create({
      data: {
        businessId,
        cashSessionId: session.id,
        total: 3000,
        paymentMethod: "CASH",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60_000),
        items: { create: [{ description: "Venta reciente", quantity: 1, unitPrice: 3000 }] },
      },
    });
    await prisma.sale.create({
      data: {
        businessId,
        cashSessionId: session.id,
        total: 1000,
        paymentMethod: "CASH",
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60_000),
        items: { create: [{ description: "Venta vieja", quantity: 1, unitPrice: 1000 }] },
      },
    });

    // Un segundo servicio, reservado más veces que "Servicio Largo" en la
    // ventana de 30 días, debería quedar primero en topServices.
    const popularService = await prisma.service.create({
      data: { businessId, name: "Servicio Popular", durationMinutes: 30, price: 2000 },
    });
    // Los tests anteriores en este mismo describe ya dejaron 6 turnos de
    // "Servicio Largo" en la ventana de 30 días (comparten el mismo
    // businessId) — con 7 turnos, "Servicio Popular" queda primero.
    const base = new Date(Date.now() - 1 * 24 * 60 * 60_000);
    for (let i = 0; i < 7; i++) {
      const start = new Date(base.getTime() + i * 60 * 60_000);
      await prisma.booking.create({
        data: {
          businessId,
          clientId,
          serviceId: popularService.id,
          staffId,
          startTime: start,
          endTime: new Date(start.getTime() + 30 * 60_000),
          status: "COMPLETED",
        },
      });
    }

    const stats = await getDashboardStats(businessId);
    expect(stats.revenueLast7).toBe(3000);
    expect(stats.revenueLast30).toBe(4000);
    expect(stats.ticketPromedio).toBe(2000); // 4000 / 2 ventas
    expect(stats.topServices[0]).toMatchObject({ name: "Servicio Popular", count: 7 });
  });

  it("excludes expired giftcards from the outstanding balance, matching /admin/giftcards", async () => {
    await prisma.giftCard.create({
      data: {
        businessId,
        code: `GC-VIGENTE-${Date.now()}`,
        initialValue: 10000,
        balance: 10000,
        active: true,
        expiresAt: null,
      },
    });
    await prisma.giftCard.create({
      data: {
        businessId,
        code: `GC-VENCIDA-${Date.now()}`,
        initialValue: 5000,
        balance: 5000,
        active: true,
        expiresAt: new Date("2020-01-01"),
      },
    });

    const stats = await getDashboardStats(businessId);
    expect(stats.outstandingGiftCardBalance).toBe(10000);
  });
});

describeIfDb("getDashboardStats — revenueTrend y projectedRevenueNext30", () => {
  let businessId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test Dashboard Trend Business", businessType: "SPA", slug: `test-dashboard-trend-${Date.now()}` },
    });
    businessId = business.id;

    const operator = await prisma.user.create({
      data: {
        businessId,
        name: "Admin Trend",
        email: `admin-dashboard-trend-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    const session = await prisma.cashRegisterSession.create({
      data: { businessId, openedById: operator.id, openingAmount: 0 },
    });

    // Una sola venta de $1400 hoy: en un día de la ventana de 14 debería
    // quedar $1400 y en el resto $0, y la proyección de 30 días es el
    // promedio diario de esos 14 días ($100) multiplicado por 30.
    await prisma.sale.create({
      data: {
        businessId,
        cashSessionId: session.id,
        total: 1400,
        paymentMethod: "CASH",
        createdAt: new Date(),
        items: { create: [{ description: "Venta de hoy", quantity: 1, unitPrice: 1400 }] },
      },
    });
  });

  afterAll(async () => {
    await prisma.saleItem.deleteMany({ where: { sale: { businessId } } });
    await prisma.sale.deleteMany({ where: { businessId } });
    await prisma.cashRegisterSession.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("buckets revenue by day for both the 14 and 30-day windows, and projects the next 30 days from the 14-day average", async () => {
    const stats = await getDashboardStats(businessId);

    expect(stats.revenueTrend).toHaveLength(14);
    expect(stats.revenueTrend30).toHaveLength(30);

    const todayKey = new Date().toISOString().slice(0, 10);
    const todayIn14 = stats.revenueTrend.find((d) => d.date === todayKey);
    const todayIn30 = stats.revenueTrend30.find((d) => d.date === todayKey);
    expect(todayIn14?.revenue).toBe(1400);
    expect(todayIn30?.revenue).toBe(1400);

    // Único día con ventas en la ventana de 14: promedio = 1400/14, * 30.
    expect(stats.projectedRevenueNext30).toBe(Math.round((1400 / 14) * 30));
  });
});
