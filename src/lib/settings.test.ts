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
  createStaff,
  updateStaff,
  createService,
  createProduct,
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

describeIfDb("createStaff / updateStaff — el email se normaliza a minúscula", () => {
  let businessId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test Staff Email Business", businessType: "SPA", slug: `test-staff-email-${Date.now()}` },
    });
    businessId = business.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("stores the email in lowercase even if createStaff got it with mixed case", async () => {
    const staff = await createStaff(businessId, {
      name: "Empleada Test",
      email: `Empleada.Mixta.${Date.now()}@Example.com`,
      password: "changeme123",
    });
    expect(staff.email).toBe(staff.email.toLowerCase());
  });

  it("stores the email in lowercase even if updateStaff got it with mixed case", async () => {
    const staff = await createStaff(businessId, {
      name: "Otra Empleada",
      email: `otra-empleada-${Date.now()}@example.com`,
      password: "changeme123",
    });
    const updated = await updateStaff(businessId, staff.id, {
      name: "Otra Empleada",
      email: `Otra.Empleada.Nueva.${Date.now()}@Example.com`,
    });
    expect(updated.email).toBe(updated.email.toLowerCase());
  });
});

describeIfDb("createService / createProduct — validan precio/duración/stock por su cuenta", () => {
  let businessId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test Settings Validation Business", businessType: "SPA", slug: `test-settings-validation-${Date.now()}` },
    });
    businessId = business.id;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { businessId } });
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("rejects a non-finite or negative service price", async () => {
    await expect(
      createService(businessId, { name: "Servicio Infinito", durationMinutes: 30, price: Infinity })
    ).rejects.toThrow(/precio/i);
    await expect(
      createService(businessId, { name: "Servicio Negativo", durationMinutes: 30, price: -100 })
    ).rejects.toThrow(/precio/i);
  });

  it("rejects a non-positive or non-integer service duration", async () => {
    await expect(
      createService(businessId, { name: "Servicio Sin Duración", durationMinutes: 0, price: 1000 })
    ).rejects.toThrow(/duración/i);
    await expect(
      createService(businessId, { name: "Servicio Duración Decimal", durationMinutes: 30.5, price: 1000 })
    ).rejects.toThrow(/duración/i);
  });

  it("rejects a non-finite or negative product price, and a negative or non-integer stock", async () => {
    await expect(
      createProduct(businessId, { name: "Producto Infinito", price: Infinity, stock: 5 })
    ).rejects.toThrow(/precio/i);
    await expect(
      createProduct(businessId, { name: "Producto Stock Negativo", price: 1000, stock: -1 })
    ).rejects.toThrow(/stock/i);
    await expect(
      createProduct(businessId, { name: "Producto Stock Decimal", price: 1000, stock: 2.5 })
    ).rejects.toThrow(/stock/i);
  });

  it("accepts a service/product with valid values", async () => {
    const service = await createService(businessId, { name: "Servicio Válido", durationMinutes: 45, price: 5000 });
    expect(Number(service.price)).toBe(5000);
    const product = await createProduct(businessId, { name: "Producto Válido", price: 2000, stock: 10 });
    expect(product.stock).toBe(10);
  });
});
