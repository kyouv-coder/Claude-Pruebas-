import "dotenv/config";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, SESSION_COOKIE } from "@/lib/session";

// Igual que las rutas de imagen de Configuración, el comprobante adjunto de
// una venta (/admin/finanzas/comprobante/[saleId]) nunca tuvo cobertura
// propia. Cubre que requiere sesión de ADMIN y que el aislamiento
// multi-tenant de getSaleInvoiceFile también se respeta desde la ruta HTTP
// real (un id de venta de otro negocio no filtra su comprobante).
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

async function createBusinessWithSaleAndInvoice(suffix: string) {
  const business = await prisma.business.create({
    data: { name: `Negocio ${suffix}`, businessType: "SPA", slug: `comprobante-${suffix}-${Date.now()}` },
  });
  const operator = await prisma.user.create({
    data: {
      businessId: business.id,
      name: `Operador ${suffix}`,
      email: `operador-comprobante-${suffix}-${Date.now()}@example.com`,
      passwordHash: "unused",
      role: "ADMIN",
    },
  });
  const session = await prisma.cashRegisterSession.create({
    data: { businessId: business.id, openedById: operator.id, openingAmount: 0 },
  });
  const sale = await prisma.sale.create({
    data: {
      businessId: business.id,
      cashSessionId: session.id,
      total: 1000,
      paymentMethod: "CASH",
      invoiceFileName: 'weird" name.pdf',
      invoiceMimeType: "application/pdf",
      invoiceFileData: Buffer.from([1, 2, 3, 4]),
    },
  });
  return { business, sale };
}

describeIfDb("GET /admin/finanzas/comprobante/[saleId]", () => {
  afterEach(() => {
    vi.doUnmock("next/headers");
    vi.resetModules();
  });

  it("rejects without a session instead of leaking any invoice", async () => {
    vi.resetModules();
    vi.doMock("next/headers", () => ({
      cookies: async () => ({ get: () => undefined }),
    }));
    const { GET } = await import("./route");
    const request = new NextRequest("http://localhost/admin/finanzas/comprobante/anything");

    await expect(GET(request, { params: Promise.resolve({ saleId: "anything" }) })).rejects.toThrow();
  });

  it("returns 404 for a sale that belongs to a different business", async () => {
    const { business: businessA } = await createBusinessWithSaleAndInvoice("a");
    const { business: businessB, sale: saleOfB } = await createBusinessWithSaleAndInvoice("b");
    const admin = await prisma.user.create({
      data: {
        businessId: businessA.id,
        name: "Admin A",
        email: `admin-comprobante-a-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });

    await mockSessionFor(admin.id);
    try {
      const { GET } = await import("./route");
      const request = new NextRequest(`http://localhost/admin/finanzas/comprobante/${saleOfB.id}`);
      const response = await GET(request, { params: Promise.resolve({ saleId: saleOfB.id }) });
      expect(response.status).toBe(404);
    } finally {
      vi.doUnmock("next/headers");
      vi.resetModules();
    }

    await prisma.sale.deleteMany({ where: { businessId: { in: [businessA.id, businessB.id] } } });
    await prisma.cashRegisterSession.deleteMany({ where: { businessId: { in: [businessA.id, businessB.id] } } });
    await prisma.user.deleteMany({ where: { businessId: { in: [businessA.id, businessB.id] } } });
    await prisma.business.deleteMany({ where: { id: { in: [businessA.id, businessB.id] } } });
    await prisma.$disconnect();
  });

  it("serves the invoice bytes with a sanitized filename header for the admin's own sale", async () => {
    const { business, sale } = await createBusinessWithSaleAndInvoice("c");
    const admin = await prisma.user.create({
      data: {
        businessId: business.id,
        name: "Admin C",
        email: `admin-comprobante-c-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });

    await mockSessionFor(admin.id);
    try {
      const { GET } = await import("./route");
      const request = new NextRequest(`http://localhost/admin/finanzas/comprobante/${sale.id}`);
      const response = await GET(request, { params: Promise.resolve({ saleId: sale.id }) });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/pdf");
      // La comilla del nombre original no debe romper ni colarse cruda en el header.
      expect(response.headers.get("Content-Disposition")).not.toContain('"weird"');
      expect(response.headers.get("Content-Disposition")).toContain("weird");
      const bytes = new Uint8Array(await response.arrayBuffer());
      expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
    } finally {
      vi.doUnmock("next/headers");
      vi.resetModules();
    }

    await prisma.sale.deleteMany({ where: { businessId: business.id } });
    await prisma.cashRegisterSession.deleteMany({ where: { businessId: business.id } });
    await prisma.user.deleteMany({ where: { businessId: business.id } });
    await prisma.business.delete({ where: { id: business.id } });
    await prisma.$disconnect();
  });
});
