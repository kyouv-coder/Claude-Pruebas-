import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { redeemGiftCard, sellGiftCard } from "./pos";

// Test de integración contra Postgres real: la resta de saldo de una
// giftcard es dinero real, y depende de una escritura atómica en la DB —
// no se puede probar de forma aislada sin una base de verdad.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("redeemGiftCard — evita dejar el saldo negativo", () => {
  let businessId: string;
  let cashSessionId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Giftcard Business",
        businessType: "SPA",
        slug: `test-giftcard-${Date.now()}`,
      },
    });
    businessId = business.id;

    const operator = await prisma.user.create({
      data: {
        businessId,
        name: "Admin Test",
        email: `admin-giftcard-${Date.now()}@example.com`,
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
    await prisma.giftCardTransaction.deleteMany({
      where: { giftCard: { businessId } },
    });
    await prisma.saleItem.deleteMany({ where: { sale: { businessId } } });
    await prisma.sale.deleteMany({ where: { businessId } });
    await prisma.giftCard.deleteMany({ where: { businessId } });
    await prisma.cashRegisterSession.deleteMany({ where: { businessId } });
    await prisma.client.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("rejects redeeming more than the remaining balance", async () => {
    const giftCard = await sellGiftCard(businessId, {
      clientName: "Cliente Giftcard Uno",
      amount: 1000,
      paymentMethod: "CASH",
      cashSessionId,
    });

    await redeemGiftCard(businessId, {
      code: giftCard.code,
      amount: 700,
      cashSessionId,
    });

    await expect(
      redeemGiftCard(businessId, {
        code: giftCard.code,
        amount: 700,
        cashSessionId,
      })
    ).rejects.toThrow(/Saldo insuficiente/);

    const final = await prisma.giftCard.findUniqueOrThrow({ where: { id: giftCard.id } });
    expect(Number(final.balance)).toBe(300);
  });

  it("never lets two simultaneous redemptions overdraw the balance", async () => {
    const giftCard = await sellGiftCard(businessId, {
      clientName: "Cliente Giftcard Dos",
      amount: 1000,
      paymentMethod: "CASH",
      cashSessionId,
    });

    // Dos canjes de 700 en paralelo sobre una giftcard de 1000: solo uno
    // puede pasar. Si la resta no fuera atómica, ambos podrían leer el
    // saldo original (1000) antes de que el otro escriba, y el saldo
    // terminaría en -400 en vez de rechazar el segundo.
    const results = await Promise.allSettled([
      redeemGiftCard(businessId, { code: giftCard.code, amount: 700, cashSessionId }),
      redeemGiftCard(businessId, { code: giftCard.code, amount: 700, cashSessionId }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const final = await prisma.giftCard.findUniqueOrThrow({ where: { id: giftCard.id } });
    expect(Number(final.balance)).toBe(300);
    expect(Number(final.balance)).toBeGreaterThanOrEqual(0);
  });
});
