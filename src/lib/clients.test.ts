import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { listClients, listFrequentNoShowClients, updateClientNotes } from "./clients";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("listClients", () => {
  let businessId: string;
  let staffId: string;
  let serviceId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test Clients Business", businessType: "SPA", slug: `test-clients-${Date.now()}` },
    });
    businessId = business.id;

    const staff = await prisma.user.create({
      data: {
        businessId,
        name: "Staff Test",
        email: `staff-clients-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "STAFF",
      },
    });
    staffId = staff.id;

    const service = await prisma.service.create({
      data: { businessId, name: "Servicio Test", durationMinutes: 30, price: 5000 },
    });
    serviceId = service.id;
  });

  afterAll(async () => {
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

  it("counts only COMPLETED bookings and ignores pending/cancelled/no-show ones for lastVisit", async () => {
    const client = await prisma.client.create({
      data: { businessId, name: "Cliente Sin Visitas Reales", email: `sin-visitas-${Date.now()}@example.com` },
    });
    await prisma.booking.create({
      data: {
        businessId,
        clientId: client.id,
        serviceId,
        staffId,
        startTime: new Date(2027, 0, 10),
        endTime: new Date(2027, 0, 10, 1),
        status: "CANCELLED",
      },
    });
    await prisma.booking.create({
      data: {
        businessId,
        clientId: client.id,
        serviceId,
        staffId,
        startTime: new Date(2027, 0, 11),
        endTime: new Date(2027, 0, 11, 1),
        status: "PENDING",
      },
    });

    const clients = await listClients(businessId);
    const row = clients.find((c) => c.id === client.id);
    expect(row?.bookingsCount).toBe(0);
    expect(row?.lastVisit).toBeNull();
  });

  it("picks the most recent date across completed bookings and sales as lastVisit, and sums sales as totalSpent", async () => {
    const client = await prisma.client.create({
      data: { businessId, name: "Cliente Con Visitas", email: `con-visitas-${Date.now()}@example.com` },
    });
    await prisma.booking.create({
      data: {
        businessId,
        clientId: client.id,
        serviceId,
        staffId,
        startTime: new Date(2027, 0, 5),
        endTime: new Date(2027, 0, 5, 1),
        status: "COMPLETED",
      },
    });

    const session = await prisma.cashRegisterSession.create({
      data: { businessId, openedById: staffId, openingAmount: 0 },
    });
    const recentSaleDate = new Date(2027, 0, 20);
    await prisma.sale.create({
      data: {
        businessId,
        clientId: client.id,
        cashSessionId: session.id,
        total: 8000,
        paymentMethod: "CASH",
        createdAt: recentSaleDate,
        items: { create: [{ description: "Producto", quantity: 1, unitPrice: 8000 }] },
      },
    });
    await prisma.sale.create({
      data: {
        businessId,
        clientId: client.id,
        cashSessionId: session.id,
        total: 2000,
        paymentMethod: "CASH",
        createdAt: new Date(2027, 0, 1),
        items: { create: [{ description: "Producto Viejo", quantity: 1, unitPrice: 2000 }] },
      },
    });

    const clients = await listClients(businessId);
    const row = clients.find((c) => c.id === client.id);
    expect(row?.bookingsCount).toBe(1);
    expect(row?.totalSpent).toBe(10000);
    expect(row?.lastVisit?.getTime()).toBe(recentSaleDate.getTime());
  });
});

describeIfDb("listFrequentNoShowClients", () => {
  let businessId: string;
  let staffId: string;
  let serviceId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test NoShow Business", businessType: "SPA", slug: `test-noshow-${Date.now()}` },
    });
    businessId = business.id;

    const staff = await prisma.user.create({
      data: {
        businessId,
        name: "Staff Test",
        email: `staff-noshow-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "STAFF",
      },
    });
    staffId = staff.id;

    const service = await prisma.service.create({
      data: { businessId, name: "Servicio Test", durationMinutes: 30, price: 5000 },
    });
    serviceId = service.id;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { businessId } });
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.client.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("only flags clients with at least minCount no-shows within the last 90 days", async () => {
    const frequentClient = await prisma.client.create({
      data: { businessId, name: "Cliente Ausente", email: `ausente-${Date.now()}@example.com` },
    });
    const occasionalClient = await prisma.client.create({
      data: { businessId, name: "Cliente Ocasional", email: `ocasional-${Date.now()}@example.com` },
    });

    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60_000);
    const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60_000); // fuera de la ventana de 90 días

    for (let i = 0; i < 2; i++) {
      await prisma.booking.create({
        data: {
          businessId,
          clientId: frequentClient.id,
          serviceId,
          staffId,
          startTime: new Date(recentDate.getTime() + i * 60_000),
          endTime: new Date(recentDate.getTime() + i * 60_000 + 60_000),
          status: "NO_SHOW",
        },
      });
    }
    // Un no-show viejo (fuera de ventana) no debería sumar al conteo.
    await prisma.booking.create({
      data: {
        businessId,
        clientId: frequentClient.id,
        serviceId,
        staffId,
        startTime: oldDate,
        endTime: new Date(oldDate.getTime() + 60_000),
        status: "NO_SHOW",
      },
    });

    await prisma.booking.create({
      data: {
        businessId,
        clientId: occasionalClient.id,
        serviceId,
        staffId,
        startTime: new Date(recentDate.getTime() + 5 * 60_000),
        endTime: new Date(recentDate.getTime() + 6 * 60_000),
        status: "NO_SHOW",
      },
    });

    const result = await listFrequentNoShowClients(businessId, 2);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ clientId: frequentClient.id, count: 2 });
  });
});

describeIfDb("updateClientNotes — aislamiento multi-tenant", () => {
  let businessId: string;
  let otherBusinessId: string;
  let clientId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test Notes Business", businessType: "SPA", slug: `test-notes-${Date.now()}` },
    });
    businessId = business.id;
    const otherBusiness = await prisma.business.create({
      data: { name: "Test Notes Other Business", businessType: "SPA", slug: `test-notes-other-${Date.now()}` },
    });
    otherBusinessId = otherBusiness.id;

    const client = await prisma.client.create({
      data: { businessId, name: "Cliente Notas" },
    });
    clientId = client.id;
  });

  afterAll(async () => {
    await prisma.client.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.business.delete({ where: { id: otherBusinessId } });
    await prisma.$disconnect();
  });

  it("rejects updating notes on a client from another business", async () => {
    await expect(updateClientNotes(otherBusinessId, clientId, "notas ajenas")).rejects.toThrow();
  });

  it("updates notes for a client in the correct business", async () => {
    const updated = await updateClientNotes(businessId, clientId, "Prefiere la tarde");
    expect(updated.notes).toBe("Prefiere la tarde");
  });
});
