import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { getBusyTimesAction, getDayAvailabilityAction } from "./availability";
import * as publicBooking from "@/lib/public-booking";
import { logUnexpectedError } from "@/lib/log";

vi.mock("@/lib/log", () => ({ logUnexpectedError: vi.fn() }));

// vi.spyOn directo sobre el módulo falla con "Cannot redefine property"
// (ver el mismo comentario en src/lib/giftcards.test.ts) — hace falta
// vi.mock con importOriginal para poder reemplazar getBusinessBySlug caso
// por caso.
vi.mock("@/lib/public-booking", async (importOriginal) => {
  const actual = await importOriginal<typeof publicBooking>();
  return { ...actual, getBusinessBySlug: vi.fn(actual.getBusinessBySlug) };
});

// getDayAvailabilityAction es un server action expuesto directamente en la
// página pública de reserva — cualquiera puede invocarlo con un string
// arbitrario, no solo desde el <input type="date"> que lo llama
// normalmente. Antes, una fecha inválida daba un Invalid Date cuyo getDay()
// es NaN: indexar el array de horarios con NaN da undefined, y leer
// `.closed` de eso explotaba con un TypeError no atrapado en vez de
// devolver una respuesta vacía como ya hace su hermana listBusyRanges
// (lib/public-booking.ts) ante el mismo tipo de entrada.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("getDayAvailabilityAction", () => {
  let slug: string;
  let businessId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test Availability Business", businessType: "SPA", slug: `test-availability-${Date.now()}` },
    });
    businessId = business.id;
    slug = business.slug;

    await prisma.businessHours.create({
      data: { businessId, dayOfWeek: 1, openTime: "09:00", closeTime: "18:00", closed: false },
    });
  });

  afterAll(async () => {
    await prisma.businessHours.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("returns configured:false for an unparseable date instead of throwing", async () => {
    await expect(getDayAvailabilityAction(slug, "not-a-date")).resolves.toEqual({
      configured: false,
    });
  });

  it("returns configured:false for an empty date", async () => {
    await expect(getDayAvailabilityAction(slug, "")).resolves.toEqual({ configured: false });
  });

  it("returns the configured hours for a valid date", async () => {
    // 2027-01-04 es lunes (dayOfWeek 1).
    await expect(getDayAvailabilityAction(slug, "2027-01-04")).resolves.toEqual({
      configured: true,
      closed: false,
      openTime: "09:00",
      closeTime: "18:00",
    });
  });

  it("logs and returns configured:false instead of throwing on an unexpected DB error", async () => {
    vi.mocked(publicBooking.getBusinessBySlug).mockRejectedValueOnce(new Error("DB down"));
    await expect(getDayAvailabilityAction(slug, "2027-01-04")).resolves.toEqual({ configured: false });
    expect(logUnexpectedError).toHaveBeenCalledTimes(1);
  });
});

describeIfDb("getBusyTimesAction", () => {
  it("logs and returns [] instead of throwing on an unexpected DB error", async () => {
    vi.mocked(publicBooking.getBusinessBySlug).mockRejectedValueOnce(new Error("DB down"));
    await expect(getBusyTimesAction("some-slug", "staff-1", "2027-01-04")).resolves.toEqual([]);
    expect(logUnexpectedError).toHaveBeenCalledTimes(1);
  });
});
