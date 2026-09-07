import "dotenv/config";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { signUp } from "./auth";

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
