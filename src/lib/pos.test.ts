import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma";
import { sellProduct, chargeBooking, sellGiftCard, openCashSession, closeCashSession } from "./pos";

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

  it("rejects a non-positive quantity instead of letting a negative decrement increase stock", async () => {
    const product = await prisma.product.create({
      data: { businessId, name: "Producto Cantidad Inválida", price: 1000, stock: 5 },
    });

    await expect(
      sellProduct(businessId, { productId: product.id, quantity: -3, paymentMethod: "CASH", cashSessionId })
    ).rejects.toThrow(/cantidad/i);
    await expect(
      sellProduct(businessId, { productId: product.id, quantity: 0, paymentMethod: "CASH", cashSessionId })
    ).rejects.toThrow(/cantidad/i);

    const final = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(final.stock).toBe(5);
  });

  it("rejects a cashSessionId from a different business", async () => {
    const otherBusiness = await prisma.business.create({
      data: { name: "Test Other Business", businessType: "SPA", slug: `test-other-${Date.now()}` },
    });
    const otherOperator = await prisma.user.create({
      data: {
        businessId: otherBusiness.id,
        name: "Admin Otro",
        email: `admin-other-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    const otherSession = await prisma.cashRegisterSession.create({
      data: { businessId: otherBusiness.id, openedById: otherOperator.id, openingAmount: 0 },
    });
    const product = await prisma.product.create({
      data: { businessId, name: "Producto Tres", price: 1000, stock: 5 },
    });

    await expect(
      sellProduct(businessId, {
        productId: product.id,
        quantity: 1,
        paymentMethod: "CASH",
        cashSessionId: otherSession.id,
      })
    ).rejects.toThrow(/no está abierta para este negocio/);

    const leaked = await prisma.sale.findFirst({ where: { businessId, cashSessionId: otherSession.id } });
    expect(leaked).toBeNull();

    await prisma.cashRegisterSession.deleteMany({ where: { businessId: otherBusiness.id } });
    await prisma.user.deleteMany({ where: { businessId: otherBusiness.id } });
    await prisma.business.delete({ where: { id: otherBusiness.id } });
  });

  it("rejects a cashSessionId that's already closed", async () => {
    const closedSession = await prisma.cashRegisterSession.create({
      data: {
        businessId,
        openedById: (await prisma.user.findFirstOrThrow({ where: { businessId, role: "ADMIN" } })).id,
        openingAmount: 0,
        closedAt: new Date(),
        closingAmount: 0,
        expectedCashAmount: 0,
      },
    });
    const product = await prisma.product.create({
      data: { businessId, name: "Producto Cuatro", price: 1000, stock: 5 },
    });

    await expect(
      sellProduct(businessId, {
        productId: product.id,
        quantity: 1,
        paymentMethod: "CASH",
        cashSessionId: closedSession.id,
      })
    ).rejects.toThrow(/no está abierta/);
  });
});

describeIfDb("openCashSession — rechaza un monto inicial inválido", () => {
  // No hace falta un operador real logueado (getOperator usa cookies()):
  // un monto inválido se rechaza antes de llegar a esa parte, así que esta
  // prueba no depende de una sesión.
  it("rejects a negative or non-finite opening amount", async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Open Session Business",
        businessType: "SPA",
        slug: `test-open-session-${Date.now()}`,
      },
    });

    await expect(openCashSession(business.id, -1)).rejects.toThrow(/monto/i);
    await expect(openCashSession(business.id, Infinity)).rejects.toThrow(/monto/i);

    const sessions = await prisma.cashRegisterSession.findMany({ where: { businessId: business.id } });
    expect(sessions).toHaveLength(0);

    await prisma.business.delete({ where: { id: business.id } });
    await prisma.$disconnect();
  });
});

describeIfDb("closeCashSession — no deja cerrar dos veces la misma caja", () => {
  let businessId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Close Session Business",
        businessType: "SPA",
        slug: `test-close-session-${Date.now()}`,
      },
    });
    businessId = business.id;
  });

  afterAll(async () => {
    await prisma.cashRegisterSession.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("rejects a negative or non-finite closing amount before touching the session", async () => {
    const operator = await prisma.user.create({
      data: {
        businessId,
        name: "Admin Test Monto Inválido",
        email: `admin-close-invalid-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    const session = await prisma.cashRegisterSession.create({
      data: { businessId, openedById: operator.id, openingAmount: 500 },
    });

    await expect(closeCashSession(businessId, session.id, -100)).rejects.toThrow(/monto/i);
    await expect(closeCashSession(businessId, session.id, Infinity)).rejects.toThrow(/monto/i);

    const unchanged = await prisma.cashRegisterSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(unchanged.closedAt).toBeNull();
  });

  it("rejects closing a session that's already closed", async () => {
    const operator = await prisma.user.create({
      data: {
        businessId,
        name: "Admin Test",
        email: `admin-close-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    const session = await prisma.cashRegisterSession.create({
      data: { businessId, openedById: operator.id, openingAmount: 1000 },
    });

    await closeCashSession(businessId, session.id, 1000);

    // Un sessionId viejo reenviado (dos pestañas, doble clic) no debe poder
    // pisar en silencio el cierre ya hecho con otro monto contado.
    await expect(closeCashSession(businessId, session.id, 5000)).rejects.toMatchObject({
      code: "P2025",
    });

    const final = await prisma.cashRegisterSession.findUniqueOrThrow({ where: { id: session.id } });
    expect(Number(final.closingAmount)).toBe(1000);
  });

  it("never lets two simultaneous closes overwrite each other", async () => {
    const operator = await prisma.user.create({
      data: {
        businessId,
        name: "Admin Test Dos",
        email: `admin-close-2-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    const session = await prisma.cashRegisterSession.create({
      data: { businessId, openedById: operator.id, openingAmount: 0 },
    });

    const results = await Promise.allSettled([
      closeCashSession(businessId, session.id, 2000),
      closeCashSession(businessId, session.id, 3000),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
  });
});

describeIfDb("sellGiftCard — no deja un cliente huérfano si falla la venta", () => {
  let businessId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Giftcard Atomic Business",
        businessType: "SPA",
        slug: `test-giftcard-atomic-${Date.now()}`,
      },
    });
    businessId = business.id;
  });

  afterAll(async () => {
    await prisma.client.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("rolls back the client creation when the sale fails", async () => {
    const clientName = "Cliente Fantasma";

    await expect(
      sellGiftCard(businessId, {
        clientName,
        amount: 5000,
        paymentMethod: "CASH",
        cashSessionId: "esta-caja-no-existe",
      })
    ).rejects.toThrow();

    const orphan = await prisma.client.findFirst({ where: { businessId, name: clientName } });
    expect(orphan).toBeNull();
  });
});

describeIfDb("chargeBooking — no permite cobrar dos veces el mismo turno", () => {
  let businessId: string;
  let cashSessionId: string;
  let bookingId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Charge Business",
        businessType: "SPA",
        slug: `test-charge-${Date.now()}`,
      },
    });
    businessId = business.id;

    const staff = await prisma.user.create({
      data: {
        businessId,
        name: "Staff Test",
        email: `staff-charge-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "STAFF",
      },
    });
    const client = await prisma.client.create({
      data: { businessId, name: "Cliente Test" },
    });
    const service = await prisma.service.create({
      data: { businessId, name: "Servicio Test", durationMinutes: 30, price: 5000 },
    });
    const booking = await prisma.booking.create({
      data: {
        businessId,
        clientId: client.id,
        serviceId: service.id,
        staffId: staff.id,
        startTime: new Date(),
        endTime: new Date(Date.now() + 30 * 60_000),
      },
    });
    bookingId = booking.id;

    const session = await prisma.cashRegisterSession.create({
      data: { businessId, openedById: staff.id, openingAmount: 0 },
    });
    cashSessionId = session.id;
  });

  afterAll(async () => {
    await prisma.saleItem.deleteMany({ where: { sale: { businessId } } });
    await prisma.sale.deleteMany({ where: { businessId } });
    await prisma.booking.deleteMany({ where: { businessId } });
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.client.deleteMany({ where: { businessId } });
    await prisma.cashRegisterSession.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("rejects a second charge with a known Prisma unique-constraint error", async () => {
    await chargeBooking(businessId, bookingId, cashSessionId, "CASH");

    // Sale.bookingId es @unique — un doble clic o dos pestañas cobrando el
    // mismo turno caen acá con un error identificable (P2002), no una
    // excepción genérica que tumbe toda la página.
    await expect(chargeBooking(businessId, bookingId, cashSessionId, "CASH")).rejects.toMatchObject({
      code: "P2002",
    });

    const sales = await prisma.sale.findMany({ where: { bookingId } });
    expect(sales).toHaveLength(1);
  });

  it("is an instance of Prisma.PrismaClientKnownRequestError", async () => {
    try {
      await chargeBooking(businessId, bookingId, cashSessionId, "CASH");
      expect.unreachable("Se esperaba que fallara al cobrar un turno ya cobrado.");
    } catch (e) {
      expect(e).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    }
  });
});
