import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { getRecommendations } from "./insights";
import { currentYearMonth } from "./finance";

// Test de integración contra Postgres real: getRecommendations combina
// varias consultas (clientes, stock, giftcards, finanzas, caja, no-shows) y
// no tenía ninguna cobertura pese a ser lo primero que ve la dueña del
// negocio en el dashboard.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("getRecommendations", () => {
  let businessId: string;
  let adminId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test Insights Business", businessType: "SPA", slug: `test-insights-${Date.now()}` },
    });
    businessId = business.id;

    const admin = await prisma.user.create({
      data: {
        businessId,
        name: "Admin Test",
        email: `admin-insights-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    await prisma.giftCardTransaction.deleteMany({ where: { giftCard: { businessId } } });
    await prisma.giftCard.deleteMany({ where: { businessId } });
    await prisma.saleItem.deleteMany({ where: { sale: { businessId } } });
    await prisma.sale.deleteMany({ where: { businessId } });
    await prisma.booking.deleteMany({ where: { businessId } });
    await prisma.expense.deleteMany({ where: { businessId } });
    await prisma.cashRegisterSession.deleteMany({ where: { businessId } });
    await prisma.product.deleteMany({ where: { businessId } });
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.client.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("flags out-of-stock products as 'alta' severity", async () => {
    await prisma.product.create({
      data: { businessId, name: "Producto Agotado", price: 1000, stock: 0 },
    });

    const recommendations = await getRecommendations(businessId);
    const stockRec = recommendations.find((r) => r.title.includes("stock bajo"));
    expect(stockRec).toBeDefined();
    expect(stockRec?.severity).toBe("alta");
  });

  it("flags a month with expenses exceeding revenue as 'este mes vas con pérdida'", async () => {
    const { year, month } = currentYearMonth();
    await prisma.expense.create({
      data: {
        businessId,
        date: new Date(year, month - 1, 1),
        category: "ALQUILER",
        description: "Arriendo",
        amount: 999999,
      },
    });

    const recommendations = await getRecommendations(businessId);
    const lossRec = recommendations.find((r) => r.title === "Este mes vas con pérdida");
    expect(lossRec).toBeDefined();
    expect(lossRec?.severity).toBe("alta");
  });

  it("flags a cash session with an unexplained difference over $5000 as 'alta'", async () => {
    const session = await prisma.cashRegisterSession.create({
      data: {
        businessId,
        openedById: adminId,
        openingAmount: 10000,
        closedAt: new Date(),
        closingAmount: 20000,
        expectedCashAmount: 10000,
      },
    });

    const recommendations = await getRecommendations(businessId);
    const cashRec = recommendations.find((r) => r.title.includes("cierre de caja"));
    expect(cashRec).toBeDefined();
    expect(cashRec?.severity).toBe("alta");
    expect(cashRec?.title).toContain("Sobrante");

    await prisma.cashRegisterSession.delete({ where: { id: session.id } });
  });

  it("sorts recommendations with 'alta' severity before 'media' and 'info'", async () => {
    const recommendations = await getRecommendations(businessId);
    const severityRank = { alta: 0, media: 1, info: 2 };
    const ranks = recommendations.map((r) => severityRank[r.severity]);
    const sorted = [...ranks].sort((a, b) => a - b);
    expect(ranks).toEqual(sorted);
  });

  it("flags a client whose last completed visit was 60+ days ago as inactive", async () => {
    const staff = await prisma.user.create({
      data: {
        businessId,
        name: "Staff Inactivo Test",
        email: `staff-inactive-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "STAFF",
      },
    });
    const service = await prisma.service.create({
      data: { businessId, name: "Servicio Inactivo Test", durationMinutes: 30, price: 5000 },
    });
    const client = await prisma.client.create({ data: { businessId, name: "Cliente Ausente" } });
    const start = new Date(Date.now() - 90 * 24 * 60 * 60_000);
    await prisma.booking.create({
      data: {
        businessId,
        clientId: client.id,
        serviceId: service.id,
        staffId: staff.id,
        startTime: start,
        endTime: new Date(start.getTime() + 30 * 60_000),
        status: "COMPLETED",
      },
    });

    const recommendations = await getRecommendations(businessId);
    const inactiveRec = recommendations.find((r) => r.title.includes("sin volver"));
    expect(inactiveRec).toBeDefined();
    expect(inactiveRec?.description).toContain("Cliente Ausente");
  });

  it("flags a client with 2+ no-shows in the last 90 days", async () => {
    const staff = await prisma.user.create({
      data: {
        businessId,
        name: "Staff No-Show Test",
        email: `staff-noshow-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "STAFF",
      },
    });
    const service = await prisma.service.create({
      data: { businessId, name: "Servicio No-Show Test", durationMinutes: 30, price: 5000 },
    });
    const client = await prisma.client.create({ data: { businessId, name: "Cliente Fantasma" } });
    for (let i = 0; i < 2; i++) {
      const start = new Date(Date.now() - (i + 1) * 24 * 60 * 60_000);
      await prisma.booking.create({
        data: {
          businessId,
          clientId: client.id,
          serviceId: service.id,
          staffId: staff.id,
          startTime: start,
          endTime: new Date(start.getTime() + 30 * 60_000),
          status: "NO_SHOW",
        },
      });
    }

    const recommendations = await getRecommendations(businessId);
    const noShowRec = recommendations.find((r) => r.title.includes("no-shows repetidos"));
    expect(noShowRec).toBeDefined();
    expect(noShowRec?.description).toContain("Cliente Fantasma");
  });

  it("flags a giftcard with balance expiring within 30 days", async () => {
    await prisma.giftCard.create({
      data: {
        businessId,
        code: `GC-INSIGHTS-${Date.now()}`,
        initialValue: 8000,
        balance: 8000,
        expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60_000),
      },
    });

    const recommendations = await getRecommendations(businessId);
    const expiryRec = recommendations.find((r) => r.title.includes("por vencer"));
    expect(expiryRec).toBeDefined();
    expect(expiryRec?.severity).toBe("media");
  });
});
