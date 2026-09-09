import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  listPublicServices,
  listPublicProducts,
  listPublicStaff,
  listBusyRanges,
  checkPublicBookingRateLimit,
  recordPublicBookingAttempt,
} from "./public-booking";

// Test de integración contra Postgres real: esto es lo que ve cualquiera
// sin loguearse en /reservar/[slug] — el aislamiento multi-tenant y los
// filtros de "activo"/"con stock" acá no tenían ninguna cobertura pese a
// ser superficie pública.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("public-booking", () => {
  let businessId: string;
  let otherBusinessId: string;
  let otherStaffId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test Public Business", businessType: "SPA", slug: `test-public-${Date.now()}` },
    });
    businessId = business.id;

    const otherBusiness = await prisma.business.create({
      data: { name: "Test Public Other Business", businessType: "SPA", slug: `test-public-other-${Date.now()}` },
    });
    otherBusinessId = otherBusiness.id;

    await prisma.service.create({
      data: { businessId, name: "Servicio Activo", durationMinutes: 30, price: 5000, active: true },
    });
    await prisma.service.create({
      data: { businessId, name: "Servicio Inactivo", durationMinutes: 30, price: 5000, active: false },
    });

    await prisma.product.create({
      data: { businessId, name: "Producto Con Stock", price: 1000, stock: 5, active: true },
    });
    await prisma.product.create({
      data: { businessId, name: "Producto Sin Stock", price: 1000, stock: 0, active: true },
    });
    await prisma.product.create({
      data: { businessId, name: "Producto Inactivo", price: 1000, stock: 5, active: false },
    });

    await prisma.user.create({
      data: {
        businessId,
        name: "Staff Activo",
        email: `staff-public-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "STAFF",
        active: true,
      },
    });
    await prisma.user.create({
      data: {
        businessId,
        name: "Admin del negocio",
        email: `admin-public-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
        active: true,
      },
    });

    const otherStaff = await prisma.user.create({
      data: {
        businessId: otherBusinessId,
        name: "Staff de otro negocio",
        email: `staff-other-public-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "STAFF",
        active: true,
      },
    });
    otherStaffId = otherStaff.id;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { businessId: { in: [businessId, otherBusinessId] } } });
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.product.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId: { in: [businessId, otherBusinessId] } } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.business.delete({ where: { id: otherBusinessId } });
    await prisma.$disconnect();
  });

  it("only lists active services", async () => {
    const services = await listPublicServices(businessId);
    expect(services.map((s) => s.name)).toEqual(["Servicio Activo"]);
  });

  it("only lists active products with stock", async () => {
    const products = await listPublicProducts(businessId);
    expect(products.map((p) => p.name)).toEqual(["Producto Con Stock"]);
  });

  it("only lists active staff, never admins", async () => {
    const staff = await listPublicStaff(businessId);
    expect(staff.map((s) => s.name)).toEqual(["Staff Activo"]);
  });

  it("returns no busy ranges when the staffId belongs to a different business", async () => {
    const ranges = await listBusyRanges(businessId, otherStaffId, "2027-01-01");
    expect(ranges).toEqual([]);
  });

  it("returns an empty array for an unparseable date instead of throwing", async () => {
    const ranges = await listBusyRanges(businessId, otherStaffId, "not-a-date");
    expect(ranges).toEqual([]);
  });
});

describeIfDb("checkPublicBookingRateLimit", () => {
  const ip = `test-public-booking-rate-${Date.now()}`;

  afterAll(async () => {
    await prisma.publicBookingAttempt.deleteMany({ where: { ip } });
    await prisma.$disconnect();
  });

  it("allows attempts under the limit and blocks once it's reached", async () => {
    for (let i = 0; i < 8; i++) {
      expect(await checkPublicBookingRateLimit(ip)).toBe(true);
      await recordPublicBookingAttempt(ip);
    }
    expect(await checkPublicBookingRateLimit(ip)).toBe(false);
  });
});
