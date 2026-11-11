import "dotenv/config";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

// Ningún route.ts de /admin/configuracion/imagen-* tenía cobertura propia —
// a diferencia del resto de la lógica de dominio, estas rutas solo se
// ejercitaban de rebote al navegar la app. Cubren dos cosas sensibles: que
// sin sesión de ADMIN no se puede pedir ninguna foto, y que el aislamiento
// multi-tenant de getProductImage (ya probado indirectamente) también se
// respeta desde la ruta HTTP real (un id de producto de otro negocio no
// filtra su foto).
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

async function mockSessionFor(userId: string) {
  const secret = process.env.AUTH_SECRET!;
  const token = await createSessionToken(userId, secret, 3600, 0);
  vi.resetModules();
  vi.doMock("next/headers", () => ({
    cookies: async () => ({
      get: (key: string) => (key === SESSION_COOKIE ? { value: token } : undefined),
    }),
  }));
}

describeIfDb("GET /admin/configuracion/imagen-producto/[id]", () => {
  afterEach(() => {
    vi.doUnmock("next/headers");
    vi.resetModules();
  });

  it("rejects without a session instead of leaking any image", async () => {
    vi.resetModules();
    vi.doMock("next/headers", () => ({
      cookies: async () => ({ get: () => undefined }),
    }));
    const { GET } = await import("./route");
    const request = new NextRequest("http://localhost/admin/configuracion/imagen-producto/anything");

    await expect(GET(request, { params: Promise.resolve({ id: "anything" }) })).rejects.toThrow();
  });

  it("returns 404 for a product that belongs to a different business (no leak by guessed id)", async () => {
    const businessA = await prisma.business.create({
      data: { name: "Negocio A", businessType: "SPA", slug: `img-prod-a-${Date.now()}` },
    });
    const businessB = await prisma.business.create({
      data: { name: "Negocio B", businessType: "SPA", slug: `img-prod-b-${Date.now()}` },
    });
    const admin = await prisma.user.create({
      data: {
        businessId: businessA.id,
        name: "Admin A",
        email: `admin-a-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    const productOfB = await prisma.product.create({
      data: {
        businessId: businessB.id,
        name: "Producto de B",
        price: 1000,
        stock: 1,
        imageData: Buffer.from([1, 2, 3]),
        imageMimeType: "image/png",
      },
    });

    await mockSessionFor(admin.id);
    try {
      const { GET } = await import("./route");
      const request = new NextRequest(
        `http://localhost/admin/configuracion/imagen-producto/${productOfB.id}`
      );
      const response = await GET(request, { params: Promise.resolve({ id: productOfB.id }) });
      expect(response.status).toBe(404);
    } finally {
      vi.doUnmock("next/headers");
      vi.resetModules();
    }

    await prisma.product.deleteMany({ where: { businessId: businessB.id } });
    await prisma.user.deleteMany({ where: { businessId: businessA.id } });
    await prisma.business.deleteMany({ where: { id: { in: [businessA.id, businessB.id] } } });
    await prisma.$disconnect();
  });

  it("serves the image bytes and content-type for the admin's own product", async () => {
    const business = await prisma.business.create({
      data: { name: "Negocio C", businessType: "SPA", slug: `img-prod-c-${Date.now()}` },
    });
    const admin = await prisma.user.create({
      data: {
        businessId: business.id,
        name: "Admin C",
        email: `admin-c-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });
    const product = await prisma.product.create({
      data: {
        businessId: business.id,
        name: "Producto propio",
        price: 1000,
        stock: 1,
        imageData: Buffer.from([9, 8, 7, 6]),
        imageMimeType: "image/png",
      },
    });

    await mockSessionFor(admin.id);
    try {
      const { GET } = await import("./route");
      const request = new NextRequest(`http://localhost/admin/configuracion/imagen-producto/${product.id}`);
      const response = await GET(request, { params: Promise.resolve({ id: product.id }) });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/png");
      const bytes = new Uint8Array(await response.arrayBuffer());
      expect(Array.from(bytes)).toEqual([9, 8, 7, 6]);
    } finally {
      vi.doUnmock("next/headers");
      vi.resetModules();
    }

    await prisma.product.deleteMany({ where: { businessId: business.id } });
    await prisma.user.deleteMany({ where: { businessId: business.id } });
    await prisma.business.delete({ where: { id: business.id } });
    await prisma.$disconnect();
  });
});
