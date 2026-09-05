import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { cleanupOldRateLimitAttempts } from "./maintenance";

// Test de integración: confirma que solo se borran los intentos viejos
// (fuera de cualquier ventana de rate limit real, que es de 60 minutos) y
// que los recientes —los que un rate limit en curso todavía necesita leer—
// se conservan.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("cleanupOldRateLimitAttempts", () => {
  afterEach(async () => {
    await prisma.signupAttempt.deleteMany({ where: { ip: { startsWith: "test-cleanup-" } } });
    await prisma.publicBookingAttempt.deleteMany({ where: { ip: { startsWith: "test-cleanup-" } } });
  });

  it("deletes attempts older than the retention window but keeps recent ones", async () => {
    const oldDate = new Date(Date.now() - 3 * 24 * 60 * 60_000); // 3 días
    const recentDate = new Date(Date.now() - 10 * 60_000); // 10 minutos

    await prisma.signupAttempt.create({ data: { ip: "test-cleanup-old", createdAt: oldDate } });
    await prisma.signupAttempt.create({ data: { ip: "test-cleanup-recent", createdAt: recentDate } });
    await prisma.publicBookingAttempt.create({ data: { ip: "test-cleanup-old", createdAt: oldDate } });
    await prisma.publicBookingAttempt.create({ data: { ip: "test-cleanup-recent", createdAt: recentDate } });

    const result = await cleanupOldRateLimitAttempts();
    expect(result.signupAttemptsDeleted).toBeGreaterThanOrEqual(1);
    expect(result.publicBookingAttemptsDeleted).toBeGreaterThanOrEqual(1);

    const remainingSignup = await prisma.signupAttempt.findMany({
      where: { ip: { startsWith: "test-cleanup-" } },
    });
    const remainingBooking = await prisma.publicBookingAttempt.findMany({
      where: { ip: { startsWith: "test-cleanup-" } },
    });
    expect(remainingSignup.map((r) => r.ip)).toEqual(["test-cleanup-recent"]);
    expect(remainingBooking.map((r) => r.ip)).toEqual(["test-cleanup-recent"]);
  });
});
