import "dotenv/config";
import bcrypt from "bcryptjs";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { signUp, checkLoginRateLimit, recordLoginAttempt, changePassword, hashPassword } from "./auth";

// Test de integración contra Postgres real: generateUniqueSlug chequea
// existencia y crea el negocio en pasos separados (no atómico), así que la
// carrera solo se reproduce contra la base real, no de forma aislada.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("signUp — slugs únicos ante negocios con nombre parecido", () => {
  const createdBusinessIds: string[] = [];

  afterEach(async () => {
    for (const businessId of createdBusinessIds) {
      await prisma.user.deleteMany({ where: { businessId } });
      await prisma.business.delete({ where: { id: businessId } }).catch(() => {});
    }
    createdBusinessIds.length = 0;
    await prisma.$disconnect();
  });

  it("gives two simultaneous signups with the same business name different slugs, not a crash", async () => {
    const businessName = `Spa Carrera ${Date.now()}`;

    const results = await Promise.allSettled([
      signUp({
        businessName,
        businessType: "SPA",
        name: "Admin Uno",
        email: `admin-uno-${Date.now()}@example.com`,
        password: "changeme123",
      }),
      signUp({
        businessName,
        businessType: "SPA",
        name: "Admin Dos",
        email: `admin-dos-${Date.now()}@example.com`,
        password: "changeme123",
      }),
    ]);

    for (const r of results) {
      if (r.status === "fulfilled") createdBusinessIds.push(r.value.business.id);
    }

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled).toHaveLength(2);

    const slugs = fulfilled.map((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof signUp>>>).value.business.slug);
    expect(new Set(slugs).size).toBe(2);
  });
});

describeIfDb("checkLoginRateLimit — límite de intentos de login por IP", () => {
  const ip = `test-login-rate-${Date.now()}`;

  afterEach(async () => {
    await prisma.loginAttempt.deleteMany({ where: { ip } });
  });

  it("allows attempts under the limit and blocks once it's reached", async () => {
    // Un email/contraseña equivocados no frena por sí solo a alguien
    // probando muchos emails distintos desde la misma IP (credential
    // stuffing) — por eso el límite es por IP, no por cuenta.
    for (let i = 0; i < 20; i++) {
      expect(await checkLoginRateLimit(ip)).toBe(true);
      await recordLoginAttempt(ip);
    }
    expect(await checkLoginRateLimit(ip)).toBe(false);
  });
});

describeIfDb("changePassword — bloqueo tras intentos fallidos con la contraseña actual", () => {
  let businessId: string;
  let userId: string;
  const realPassword = "contrasena-real-123";

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test ChangePassword Business", businessType: "SPA", slug: `test-changepw-${Date.now()}` },
    });
    businessId = business.id;

    const user = await prisma.user.create({
      data: {
        businessId,
        name: "Admin Test",
        email: `admin-changepw-${Date.now()}@example.com`,
        passwordHash: await hashPassword(realPassword),
        role: "ADMIN",
      },
    });
    userId = user.id;
  });

  afterEach(async () => {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("locks the account after 5 wrong current-password attempts, same as login", async () => {
    for (let i = 0; i < 5; i++) {
      const result = await changePassword(userId, "contraseña-incorrecta", "nueva-contrasena-456");
      expect(result.error).toBe("La contraseña actual no es correcta.");
    }

    // La sexta, incluso con la contraseña correcta, cae en el bloqueo.
    const locked = await changePassword(userId, realPassword, "nueva-contrasena-456");
    expect(locked.error).toMatch(/bloqueada temporalmente/);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const stillHasOldPassword = await bcrypt.compare(realPassword, user.passwordHash);
    expect(stillHasOldPassword).toBe(true);
  });

  it("resets the failed-attempts counter on a successful change", async () => {
    await changePassword(userId, "contraseña-incorrecta", "nueva-contrasena-456");
    const result = await changePassword(userId, realPassword, "nueva-contrasena-789");
    expect(result.error).toBeNull();

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lockedUntil).toBeNull();

    // Dejar la contraseña como estaba para no afectar otros tests de este bloque.
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(realPassword) },
    });
  });
});
