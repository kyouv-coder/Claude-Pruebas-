import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  checkWithinBusinessHours,
  saveBusinessHours,
  getBusinessHours,
  hasConfiguredHours,
} from "./business-hours";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("checkWithinBusinessHours", () => {
  let businessId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Hours Business",
        businessType: "SPA",
        slug: `test-hours-${Date.now()}`,
      },
    });
    businessId = business.id;
  });

  afterAll(async () => {
    await prisma.businessHours.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("allows anything when the business never configured hours", async () => {
    // 2027-01-17 es domingo — sin configuración, no debería bloquear nada.
    const start = new Date("2027-01-17T03:00:00");
    const end = new Date("2027-01-17T04:00:00");
    const result = await checkWithinBusinessHours(businessId, start, end);
    expect(result.ok).toBe(true);
  });

  it("blocks a day marked as closed once hours are configured", async () => {
    await saveBusinessHours(businessId, [
      { dayOfWeek: 0, openTime: "09:00", closeTime: "19:00", closed: true }, // domingo
      { dayOfWeek: 1, openTime: "09:00", closeTime: "19:00", closed: false },
      { dayOfWeek: 2, openTime: "09:00", closeTime: "19:00", closed: false },
      { dayOfWeek: 3, openTime: "09:00", closeTime: "19:00", closed: false },
      { dayOfWeek: 4, openTime: "09:00", closeTime: "19:00", closed: false },
      { dayOfWeek: 5, openTime: "09:00", closeTime: "19:00", closed: false },
      { dayOfWeek: 6, openTime: "09:00", closeTime: "13:00", closed: false },
    ]);

    // 2027-01-17 sigue siendo domingo.
    const start = new Date("2027-01-17T10:00:00");
    const end = new Date("2027-01-17T11:00:00");
    const result = await checkWithinBusinessHours(businessId, start, end);
    expect(result.ok).toBe(false);
  });

  it("rejects a start time before opening or an end time after closing", async () => {
    // 2027-01-18 es lunes, horario configurado 09:00–19:00.
    const tooEarly = await checkWithinBusinessHours(
      businessId,
      new Date("2027-01-18T08:00:00"),
      new Date("2027-01-18T09:00:00")
    );
    expect(tooEarly.ok).toBe(false);

    const tooLate = await checkWithinBusinessHours(
      businessId,
      new Date("2027-01-18T18:30:00"),
      new Date("2027-01-18T19:30:00")
    );
    expect(tooLate.ok).toBe(false);
  });

  it("allows a booking fully inside the configured window", async () => {
    const result = await checkWithinBusinessHours(
      businessId,
      new Date("2027-01-18T10:00:00"),
      new Date("2027-01-18T11:00:00")
    );
    expect(result.ok).toBe(true);
  });

  it("rejects a booking that crosses midnight into the next day", async () => {
    // 2027-01-18 es lunes con horario configurado, pero da igual el
    // horario puntual acá: cruzar la medianoche se rechaza antes de
    // siquiera mirar la franja de atención de ningún día.
    const result = await checkWithinBusinessHours(
      businessId,
      new Date("2027-01-18T23:30:00"),
      new Date("2027-01-19T00:30:00")
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("medianoche");
    }
  });
});

describeIfDb("getBusinessHours", () => {
  let businessId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Get Hours Business",
        businessType: "SPA",
        slug: `test-get-hours-${Date.now()}`,
      },
    });
    businessId = business.id;
  });

  afterAll(async () => {
    await prisma.businessHours.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("returns 7 days defaulting to 09:00–19:00 open, Sunday closed, when nothing was ever saved", async () => {
    const hours = await getBusinessHours(businessId);
    expect(hours).toHaveLength(7);
    expect(hours.map((h) => h.dayOfWeek)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(hours[0]).toMatchObject({ dayOfWeek: 0, closed: true });
    for (const day of hours.slice(1)) {
      expect(day).toMatchObject({ openTime: "09:00", closeTime: "19:00", closed: false });
    }
  });

  it("returns the saved value for a configured day and keeps defaults for the rest", async () => {
    await prisma.businessHours.create({
      data: { businessId, dayOfWeek: 3, openTime: "10:30", closeTime: "14:00", closed: false },
    });

    const hours = await getBusinessHours(businessId);
    const wednesday = hours.find((h) => h.dayOfWeek === 3);
    expect(wednesday).toMatchObject({ openTime: "10:30", closeTime: "14:00", closed: false });
    // El resto de los días sigue con el default, no se ve afectado.
    const tuesday = hours.find((h) => h.dayOfWeek === 2);
    expect(tuesday).toMatchObject({ openTime: "09:00", closeTime: "19:00", closed: false });
  });
});

describeIfDb("saveBusinessHours", () => {
  let businessId: string;
  let otherBusinessId: string;

  beforeAll(async () => {
    const [business, otherBusiness] = await Promise.all([
      prisma.business.create({
        data: {
          name: "Test Save Hours Business",
          businessType: "SPA",
          slug: `test-save-hours-${Date.now()}`,
        },
      }),
      prisma.business.create({
        data: {
          name: "Test Save Hours Other Business",
          businessType: "SPA",
          slug: `test-save-hours-other-${Date.now()}`,
        },
      }),
    ]);
    businessId = business.id;
    otherBusinessId = otherBusiness.id;
  });

  afterAll(async () => {
    await prisma.businessHours.deleteMany({ where: { businessId: { in: [businessId, otherBusinessId] } } });
    await prisma.business.deleteMany({ where: { id: { in: [businessId, otherBusinessId] } } });
    await prisma.$disconnect();
  });

  it("creates rows for a business that never saved hours before", async () => {
    await saveBusinessHours(businessId, [
      { dayOfWeek: 0, openTime: "09:00", closeTime: "19:00", closed: true },
      { dayOfWeek: 1, openTime: "08:00", closeTime: "18:00", closed: false },
    ]);

    const rows = await prisma.businessHours.findMany({ where: { businessId } });
    expect(rows).toHaveLength(2);
    const monday = rows.find((r) => r.dayOfWeek === 1);
    expect(monday).toMatchObject({ openTime: "08:00", closeTime: "18:00", closed: false });
  });

  it("updates an existing day in place instead of creating a duplicate row", async () => {
    await saveBusinessHours(businessId, [
      { dayOfWeek: 1, openTime: "10:00", closeTime: "15:00", closed: false },
    ]);

    const rows = await prisma.businessHours.findMany({ where: { businessId, dayOfWeek: 1 } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ openTime: "10:00", closeTime: "15:00", closed: false });
  });

  it("never touches another business's saved hours", async () => {
    await saveBusinessHours(otherBusinessId, [
      { dayOfWeek: 1, openTime: "07:00", closeTime: "12:00", closed: false },
    ]);

    await saveBusinessHours(businessId, [
      { dayOfWeek: 1, openTime: "11:00", closeTime: "16:00", closed: false },
    ]);

    const otherRows = await prisma.businessHours.findMany({ where: { businessId: otherBusinessId, dayOfWeek: 1 } });
    expect(otherRows).toHaveLength(1);
    expect(otherRows[0]).toMatchObject({ openTime: "07:00", closeTime: "12:00" });
  });
});

describeIfDb("hasConfiguredHours", () => {
  let businessId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Has Configured Hours Business",
        businessType: "SPA",
        slug: `test-has-configured-hours-${Date.now()}`,
      },
    });
    businessId = business.id;
  });

  afterAll(async () => {
    await prisma.businessHours.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("is false until the business saves at least one day, then true", async () => {
    // Usado por la página pública de reserva (para mostrar/ocultar el
    // horario de atención) y por Configuración/Onboarding — sin este
    // chequeo, ambos asumirían "sin restricción" incluso después de
    // guardar un horario real.
    expect(await hasConfiguredHours(businessId)).toBe(false);

    await saveBusinessHours(businessId, [
      { dayOfWeek: 0, openTime: "09:00", closeTime: "19:00", closed: true },
      { dayOfWeek: 1, openTime: "09:00", closeTime: "19:00", closed: false },
      { dayOfWeek: 2, openTime: "09:00", closeTime: "19:00", closed: false },
      { dayOfWeek: 3, openTime: "09:00", closeTime: "19:00", closed: false },
      { dayOfWeek: 4, openTime: "09:00", closeTime: "19:00", closed: false },
      { dayOfWeek: 5, openTime: "09:00", closeTime: "19:00", closed: false },
      { dayOfWeek: 6, openTime: "09:00", closeTime: "13:00", closed: false },
    ]);

    expect(await hasConfiguredHours(businessId)).toBe(true);
  });
});
