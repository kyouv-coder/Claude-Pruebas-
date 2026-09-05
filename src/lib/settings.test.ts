import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  setServiceImage,
  getServiceImage,
  setProductImage,
  getProductImage,
  setBusinessCoverImage,
  getBusinessCoverImage,
} from "./settings";

// Test de integración contra Postgres real: valida el mismo tipo de cosas
// que finance.test.ts para los comprobantes — tipo/tamaño de archivo y
// aislamiento multi-tenant — pero para las fotos de servicios, productos y
// portada del negocio (Configuración), que tampoco tenían cobertura.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("setServiceImage / setProductImage / setBusinessCoverImage", () => {
  let businessId: string;
  let otherBusinessId: string;
  let serviceId: string;
  let productId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test Images Business", businessType: "SPA", slug: `test-images-${Date.now()}` },
    });
    businessId = business.id;

    const otherBusiness = await prisma.business.create({
      data: { name: "Test Images Other Business", businessType: "SPA", slug: `test-images-other-${Date.now()}` },
    });
    otherBusinessId = otherBusiness.id;

    const service = await prisma.service.create({
      data: { businessId, name: "Servicio de prueba", durationMinutes: 30, price: 5000 },
    });
    serviceId = service.id;

    const product = await prisma.product.create({
      data: { businessId, name: "Producto de prueba", price: 3000, stock: 10 },
    });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { businessId } });
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.business.delete({ where: { id: otherBusinessId } });
    await prisma.$disconnect();
  });

  const validImage = { type: "image/png", data: Buffer.from("fake-png-bytes") };
  const oversizedImage = { type: "image/png", data: Buffer.alloc(4 * 1024 * 1024 + 1) };
  const wrongTypeImage = { type: "image/gif", data: Buffer.from("fake-gif-bytes") };

  it("rejects a disallowed image type for a service", async () => {
    await expect(setServiceImage(businessId, serviceId, wrongTypeImage)).rejects.toThrow(/Solo se aceptan/);
  });

  it("rejects an oversized image for a service", async () => {
    await expect(setServiceImage(businessId, serviceId, oversizedImage)).rejects.toThrow(/no puede pesar/);
  });

  it("rejects setting an image on a service from another business", async () => {
    await expect(setServiceImage(otherBusinessId, serviceId, validImage)).rejects.toThrow();
  });

  it("stores and retrieves a valid service image", async () => {
    await setServiceImage(businessId, serviceId, validImage);
    const image = await getServiceImage(businessId, serviceId);
    expect(image?.mimeType).toBe("image/png");
    expect(Buffer.compare(image!.data, validImage.data)).toBe(0);
  });

  it("returns null for a service image requested from another business", async () => {
    const image = await getServiceImage(otherBusinessId, serviceId);
    expect(image).toBeNull();
  });

  it("rejects a disallowed image type for a product", async () => {
    await expect(setProductImage(businessId, productId, wrongTypeImage)).rejects.toThrow(/Solo se aceptan/);
  });

  it("rejects setting an image on a product from another business", async () => {
    await expect(setProductImage(otherBusinessId, productId, validImage)).rejects.toThrow();
  });

  it("stores and retrieves a valid product image", async () => {
    await setProductImage(businessId, productId, validImage);
    const image = await getProductImage(businessId, productId);
    expect(image?.mimeType).toBe("image/png");
    expect(Buffer.compare(image!.data, validImage.data)).toBe(0);
  });

  it("rejects an oversized business cover image", async () => {
    await expect(setBusinessCoverImage(businessId, oversizedImage)).rejects.toThrow(/no puede pesar/);
  });

  it("stores and retrieves a valid business cover image", async () => {
    await setBusinessCoverImage(businessId, validImage);
    const image = await getBusinessCoverImage(businessId);
    expect(image?.mimeType).toBe("image/png");
    expect(Buffer.compare(image!.data, validImage.data)).toBe(0);
  });
});
