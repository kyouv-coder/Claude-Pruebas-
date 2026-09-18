import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { redeemGiftCard, sellGiftCard } from "./pos";
import { getGiftCardStats } from "./giftcards";

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

  it("stores the expiration date when provided, and leaves it null otherwise", async () => {
    const expiresAt = new Date("2027-06-30T23:59:59");
    const withExpiry = await sellGiftCard(businessId, {
      clientName: "Cliente Con Vencimiento",
      amount: 5000,
      paymentMethod: "CASH",
      cashSessionId,
      expiresAt,
    });
    expect(withExpiry.expiresAt?.getTime()).toBe(expiresAt.getTime());

    const withoutExpiry = await sellGiftCard(businessId, {
      clientName: "Cliente Sin Vencimiento",
      amount: 5000,
      paymentMethod: "CASH",
      cashSessionId,
    });
    expect(withoutExpiry.expiresAt).toBeNull();
  });

  it("rejects a non-positive redemption amount instead of letting a negative decrement top up the balance", async () => {
    const giftCard = await sellGiftCard(businessId, {
      clientName: "Cliente Giftcard Monto Inválido",
      amount: 1000,
      paymentMethod: "CASH",
      cashSessionId,
    });

    await expect(
      redeemGiftCard(businessId, { code: giftCard.code, amount: -500, cashSessionId })
    ).rejects.toThrow(/monto/i);
    await expect(
      redeemGiftCard(businessId, { code: giftCard.code, amount: 0, cashSessionId })
    ).rejects.toThrow(/monto/i);

    const unchanged = await prisma.giftCard.findUniqueOrThrow({ where: { id: giftCard.id } });
    expect(Number(unchanged.balance)).toBe(1000);
  });

  it("rejects redeeming an expired giftcard even if it's still marked active", async () => {
    // Una giftcard vencida en la realidad nace con fecha futura y el tiempo
    // pasa — sellGiftCard ya no deja vender una con vencimiento pasado (ver
    // test de abajo), así que acá se simula directamente en la base el
    // estado "ya vencida" al que una tarjeta real llega con el tiempo.
    const client = await prisma.client.create({
      data: { businessId, name: "Cliente Giftcard Vencida" },
    });
    const giftCard = await prisma.giftCard.create({
      data: {
        businessId,
        code: `GC-VENCIDA-${Date.now()}`,
        initialValue: 2000,
        balance: 2000,
        clientId: client.id,
        expiresAt: new Date("2020-01-01"),
      },
    });

    await expect(
      redeemGiftCard(businessId, { code: giftCard.code, amount: 500, cashSessionId })
    ).rejects.toThrow(/vencida/);

    const unchanged = await prisma.giftCard.findUniqueOrThrow({ where: { id: giftCard.id } });
    expect(Number(unchanged.balance)).toBe(2000);
  });

  it("rejects selling a giftcard with an expiration date already in the past", async () => {
    await expect(
      sellGiftCard(businessId, {
        clientName: "Cliente Vencimiento Pasado",
        amount: 1000,
        paymentMethod: "CASH",
        cashSessionId,
        expiresAt: new Date("2020-01-01"),
      })
    ).rejects.toThrow(/no puede ser en el pasado/);
  });
});

describeIfDb("getGiftCardStats", () => {
  let businessId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Giftcard Stats Business",
        businessType: "SPA",
        slug: `test-giftcard-stats-${Date.now()}`,
      },
    });
    businessId = business.id;
  });

  afterAll(async () => {
    await prisma.giftCard.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("counts a giftcard as outstanding only if active, with balance, and not expired", async () => {
    // Activa con saldo, sin vencimiento: cuenta.
    await prisma.giftCard.create({
      data: { businessId, code: `GC-A-${Date.now()}`, initialValue: 1000, balance: 1000, active: true },
    });
    // Activa con saldo, vencimiento futuro: cuenta.
    await prisma.giftCard.create({
      data: {
        businessId,
        code: `GC-B-${Date.now()}`,
        initialValue: 2000,
        balance: 2000,
        active: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000),
      },
    });
    // Activa pero vencida: no cuenta, aunque nada la haya desactivado sola.
    await prisma.giftCard.create({
      data: {
        businessId,
        code: `GC-C-${Date.now()}`,
        initialValue: 3000,
        balance: 3000,
        active: true,
        expiresAt: new Date("2020-01-01"),
      },
    });
    // Saldo en cero: no cuenta aunque siga marcada active.
    await prisma.giftCard.create({
      data: { businessId, code: `GC-D-${Date.now()}`, initialValue: 500, balance: 0, active: true },
    });
    // Desactivada manualmente: no cuenta.
    await prisma.giftCard.create({
      data: { businessId, code: `GC-E-${Date.now()}`, initialValue: 800, balance: 800, active: false },
    });

    const stats = await getGiftCardStats(businessId);
    expect(stats.total).toBe(5);
    expect(stats.activeCount).toBe(2);
    expect(stats.outstandingBalance).toBe(3000); // 1000 + 2000
  });
});
