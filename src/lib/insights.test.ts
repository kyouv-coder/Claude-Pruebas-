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
});
