import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { sellProduct } from "./pos";

// Test de integración contra Postgres real: mismo patrón que
// giftcards.test.ts — sellProduct usa un update condicionado (no
// leer-y-después-escribir) para descontar stock, y esa atomicidad solo se
// puede probar de verdad contra la base, no de forma aislada.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("sellProduct — evita dejar el stock negativo", () => {
  let businessId: string;
  let cashSessionId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Pos Business",
        businessType: "SPA",
        slug: `test-pos-${Date.now()}`,
      },
    });
    businessId = business.id;

    const operator = await prisma.user.create({
      data: {
        businessId,
        name: "Admin Test",
        email: `admin-pos-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });

    const session = await prisma.cashRegisterSession.create({
      data: { businessId, openedById: operator.id, openingAmount: 0 },
    });
    cashSessionId = session.id;
  });

  afterAll(async () => {
    await prisma.saleItem.deleteMany({ where: { sale: { businessId } } });
    await prisma.sale.deleteMany({ where: { businessId } });
    await prisma.product.deleteMany({ where: { businessId } });
    await prisma.cashRegisterSession.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("rejects selling more units than the remaining stock", async () => {
    const product = await prisma.product.create({
      data: { businessId, name: "Producto Uno", price: 1000, stock: 5 },
    });

    await sellProduct(businessId, {
      productId: product.id,
      quantity: 3,
      paymentMethod: "CASH",
      cashSessionId,
    });

    await expect(
      sellProduct(businessId, {
        productId: product.id,
        quantity: 3,
        paymentMethod: "CASH",
        cashSessionId,
      })
    ).rejects.toThrow(/Stock insuficiente/);

    const final = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(final.stock).toBe(2);
  });

  it("never lets two simultaneous sales oversell the same stock", async () => {
    const product = await prisma.product.create({
      data: { businessId, name: "Producto Dos", price: 1000, stock: 5 },
    });

    // Dos ventas de 3 unidades en paralelo sobre un stock de 5: solo una
    // puede pasar. Si el descuento no fuera atómico, ambas podrían leer el
    // stock original (5) antes de que la otra escriba, y terminaría en
    // -1 en vez de rechazar la segunda.
    const results = await Promise.allSettled([
      sellProduct(businessId, { productId: product.id, quantity: 3, paymentMethod: "CASH", cashSessionId }),
      sellProduct(businessId, { productId: product.id, quantity: 3, paymentMethod: "CASH", cashSessionId }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const final = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(final.stock).toBe(2);
    expect(final.stock).toBeGreaterThanOrEqual(0);
  });
});
