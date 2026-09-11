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
