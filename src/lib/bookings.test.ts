import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { createBooking } from "./bookings";

// Test de integración contra Postgres real: la prevención de doble reserva
// es lógica de negocio crítica (evita que dos clientes queden citados con
// el mismo profesional a la misma hora) y depende de una query a la DB, no
// se puede probar de forma aislada sin una base de verdad.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("createBooking — prevención de doble reserva", () => {
  let businessId: string;
  let staffId: string;
  let serviceId: string;
  let productId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Overlap Business",
        businessType: "SPA",
        slug: `test-overlap-${Date.now()}`,
      },
    });
    businessId = business.id;

    const staff = await prisma.user.create({
      data: {
        businessId,
        name: "Staff Test",
        email: `staff-overlap-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "STAFF",
      },
    });
    staffId = staff.id;

    const service = await prisma.service.create({
      data: {
        businessId,
        name: "Servicio Test",
        durationMinutes: 60,
        price: 1000,
      },
    });
    serviceId = service.id;

    const product = await prisma.product.create({
      data: { businessId, name: "Producto Test", price: 500, stock: 10 },
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.bookingProductRequest.deleteMany({ where: { booking: { businessId } } });
    await prisma.booking.deleteMany({ where: { businessId } });
    await prisma.client.deleteMany({ where: { businessId } });
    await prisma.product.deleteMany({ where: { businessId } });
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("attaches requested products to the booking and ignores foreign/invalid ones", async () => {
    const start = new Date("2027-01-17T10:00:00Z");
    const booking = await createBooking(businessId, {
      clientName: "Cliente Producto",
      clientEmail: "cliente-producto@example.com",
      serviceId,
      staffId,
      startTime: start,
      productRequests: [
        { productId, quantity: 2 },
        { productId: "no-existe", quantity: 1 },
        { productId, quantity: 0 },
      ],
    });

    expect(booking.productRequests).toHaveLength(1);
    expect(booking.productRequests[0]).toMatchObject({ productId, quantity: 2 });
  });

  it("rejects a booking that overlaps an existing one for the same staff", async () => {
    const start = new Date("2027-01-15T10:00:00Z");
    await createBooking(businessId, {
      clientName: "Cliente Uno",
      clientEmail: "cliente-uno@example.com",
      serviceId,
      staffId,
      startTime: start,
    });

    const overlappingStart = new Date("2027-01-15T10:30:00Z");
    await expect(
      createBooking(businessId, {
        clientName: "Cliente Dos",
        clientEmail: "cliente-dos@example.com",
        serviceId,
        staffId,
        startTime: overlappingStart,
      })
    ).rejects.toThrow(/ya tiene un turno reservado/);
  });

  it("allows a booking right after the previous one ends", async () => {
    const start = new Date("2027-01-16T10:00:00Z");
    await createBooking(businessId, {
      clientName: "Cliente Tres",
      clientEmail: "cliente-tres@example.com",
      serviceId,
      staffId,
      startTime: start,
    });

    // El servicio dura 60 min, así que 11:00 no se solapa con el turno de 10:00-11:00.
    const backToBackStart = new Date("2027-01-16T11:00:00Z");
    await expect(
      createBooking(businessId, {
        clientName: "Cliente Cuatro",
        clientEmail: "cliente-cuatro@example.com",
        serviceId,
        staffId,
        startTime: backToBackStart,
      })
    ).resolves.toMatchObject({ staffId });
  });
});
