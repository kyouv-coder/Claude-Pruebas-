import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { checkWithinBusinessHours, saveBusinessHours } from "./business-hours";

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
});
