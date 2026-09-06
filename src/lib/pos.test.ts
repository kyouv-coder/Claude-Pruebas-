import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { Prisma } from "@/generated/prisma";
import { sellProduct, chargeBooking } from "./pos";

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
