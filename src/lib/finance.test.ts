import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { attachSaleInvoice, getSaleInvoiceFile } from "./finance";

// Test de integración contra Postgres real: attachSaleInvoice valida tipo y
// tamaño de archivo, y el aislamiento multi-tenant (no se puede adjuntar un
// comprobante a una venta de otro negocio) depende de la restricción real
// en la base, no se puede probar de forma aislada.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("attachSaleInvoice", () => {
  let businessId: string;
  let otherBusinessId: string;
  let saleId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: {
        name: "Test Invoice Business",
        businessType: "SPA",
        slug: `test-invoice-${Date.now()}`,
      },
    });
    businessId = business.id;

    const otherBusiness = await prisma.business.create({
      data: {
        name: "Test Invoice Other Business",
        businessType: "SPA",
        slug: `test-invoice-other-${Date.now()}`,
      },
    });
    otherBusinessId = otherBusiness.id;

    const operator = await prisma.user.create({
      data: {
        businessId,
        name: "Admin Test",
        email: `admin-invoice-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "ADMIN",
      },
    });

    const session = await prisma.cashRegisterSession.create({
      data: { businessId, openedById: operator.id, openingAmount: 0 },
    });

    const sale = await prisma.sale.create({
      data: {
        businessId,
        cashSessionId: session.id,
        total: 10000,
        paymentMethod: "CASH",
        items: { create: [{ description: "Servicio de prueba", quantity: 1, unitPrice: 10000 }] },
      },
    });
    saleId = sale.id;
  });

  afterAll(async () => {
    await prisma.saleItem.deleteMany({ where: { sale: { businessId } } });
    await prisma.sale.deleteMany({ where: { businessId } });
    await prisma.cashRegisterSession.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.business.delete({ where: { id: otherBusinessId } });
    await prisma.$disconnect();
  });

  it("rejects a disallowed file type", async () => {
    await expect(
      attachSaleInvoice(businessId, saleId, {
        name: "comprobante.svg",
        type: "image/svg+xml",
        data: Buffer.from("<svg></svg>"),
      })
    ).rejects.toThrow(/Solo se aceptan/);
  });

  it("rejects a file over the size limit", async () => {
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);
    await expect(
      attachSaleInvoice(businessId, saleId, {
        name: "comprobante.png",
        type: "image/png",
        data: oversized,
      })
    ).rejects.toThrow(/no puede pesar/);
  });

  it("rejects attaching to a sale from another business", async () => {
    await expect(
      attachSaleInvoice(otherBusinessId, saleId, {
        name: "comprobante.png",
        type: "image/png",
        data: Buffer.from("fake-png-bytes"),
      })
    ).rejects.toThrow();
  });

  it("stores a valid invoice and returns it via getSaleInvoiceFile", async () => {
    const data = Buffer.from("fake-png-bytes");
    await attachSaleInvoice(businessId, saleId, {
      name: "comprobante.png",
      type: "image/png",
      data,
    });

    const file = await getSaleInvoiceFile(businessId, saleId);
    expect(file).not.toBeNull();
    expect(file?.mimeType).toBe("image/png");
    expect(file?.fileName).toBe("comprobante.png");
    expect(Buffer.compare(file!.data, data)).toBe(0);
  });

  it("returns null for a sale from another business", async () => {
    const file = await getSaleInvoiceFile(otherBusinessId, saleId);
    expect(file).toBeNull();
  });
});
