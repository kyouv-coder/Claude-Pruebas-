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
  updateService,
  updateProduct,
  setServiceActive,
  setProductActive,
  setStaffActive,
  listAllServices,
  listAllProducts,
  listAllStaff,
  updateBusinessProfile,
  updateSlackWebhook,
  updateCancellationPolicy,
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

  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const validImage = { type: "image/png", data: Buffer.concat([pngSignature, Buffer.from("fake-png-body")]) };
  const oversizedImage = { type: "image/png", data: Buffer.alloc(4 * 1024 * 1024 + 1) };
  const wrongTypeImage = { type: "image/gif", data: Buffer.from("fake-gif-bytes") };
  const spoofedImage = { type: "image/png", data: Buffer.from("<script>alert(1)</script>") };

  it("rejects a disallowed image type for a service", async () => {
    await expect(setServiceImage(businessId, serviceId, wrongTypeImage)).rejects.toThrow(/Solo se aceptan/);
  });

  it("rejects an oversized image for a service", async () => {
    await expect(setServiceImage(businessId, serviceId, oversizedImage)).rejects.toThrow(/no puede pesar/);
  });

  it("rejects a file whose real bytes don't match its declared image type", async () => {
    await expect(setServiceImage(businessId, serviceId, spoofedImage)).rejects.toThrow(/no parece ser una imagen válida/);
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

// updateService/updateProduct llaman a las mismas assertValidPrice/
// assertValidDuration/assertValidStock que createService/createProduct
// (ya cubiertas arriba), pero nunca tuvieron un test propio que probara
// que la validación también se aplica al editar, no solo al crear.
describeIfDb("updateService / updateProduct — validan precio/duración/stock por su cuenta", () => {
  let businessId: string;
  let serviceId: string;
  let productId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test Settings Update Validation Business", businessType: "SPA", slug: `test-settings-update-validation-${Date.now()}` },
    });
    businessId = business.id;

    const service = await createService(businessId, { name: "Servicio Original", durationMinutes: 30, price: 1000 });
    serviceId = service.id;
    const product = await createProduct(businessId, { name: "Producto Original", price: 1000, stock: 5 });
    productId = product.id;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { businessId } });
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("rejects a non-finite or negative service price on update", async () => {
    await expect(
      updateService(businessId, serviceId, { name: "Servicio Original", durationMinutes: 30, price: Infinity })
    ).rejects.toThrow(/precio/i);
    await expect(
      updateService(businessId, serviceId, { name: "Servicio Original", durationMinutes: 30, price: -100 })
    ).rejects.toThrow(/precio/i);
  });

  it("rejects a non-positive or non-integer service duration on update", async () => {
    await expect(
      updateService(businessId, serviceId, { name: "Servicio Original", durationMinutes: 0, price: 1000 })
    ).rejects.toThrow(/duración/i);
    await expect(
      updateService(businessId, serviceId, { name: "Servicio Original", durationMinutes: 30.5, price: 1000 })
    ).rejects.toThrow(/duración/i);
  });

  it("rejects a non-finite or negative product price, and a negative or non-integer stock on update", async () => {
    await expect(
      updateProduct(businessId, productId, { name: "Producto Original", price: Infinity, stock: 5 })
    ).rejects.toThrow(/precio/i);
    await expect(
      updateProduct(businessId, productId, { name: "Producto Original", price: 1000, stock: -1 })
    ).rejects.toThrow(/stock/i);
    await expect(
      updateProduct(businessId, productId, { name: "Producto Original", price: 1000, stock: 2.5 })
    ).rejects.toThrow(/stock/i);
  });

  it("accepts a valid update and persists the new values", async () => {
    const service = await updateService(businessId, serviceId, { name: "Servicio Editado", durationMinutes: 60, price: 3000 });
    expect(Number(service.price)).toBe(3000);
    expect(service.durationMinutes).toBe(60);
    const product = await updateProduct(businessId, productId, { name: "Producto Editado", price: 4000, stock: 20 });
    expect(product.stock).toBe(20);
    expect(Number(product.price)).toBe(4000);
  });
});

// setServiceActive/setProductActive/setStaffActive/listAllServices/
// listAllProducts/listAllStaff/updateBusinessProfile solo se ejercitaban
// indirectamente (a través de otros tests o de la UI) — acá se prueba
// directamente el comportamiento de activar/desactivar y el aislamiento
// multi-tenant en los listados y en la edición del perfil del negocio.
describeIfDb("setServiceActive / setProductActive / setStaffActive / listAllServices / listAllProducts / listAllStaff / updateBusinessProfile", () => {
  let businessId: string;
  let otherBusinessId: string;
  let serviceId: string;
  let productId: string;
  let staffId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test Active Toggle Business", businessType: "SPA", slug: `test-active-toggle-${Date.now()}` },
    });
    businessId = business.id;

    const otherBusiness = await prisma.business.create({
      data: { name: "Test Active Toggle Other Business", businessType: "SPA", slug: `test-active-toggle-other-${Date.now()}` },
    });
    otherBusinessId = otherBusiness.id;

    const service = await createService(businessId, { name: "Servicio Activable", durationMinutes: 30, price: 1000 });
    serviceId = service.id;
    const product = await createProduct(businessId, { name: "Producto Activable", price: 1000, stock: 5 });
    productId = product.id;
    const staff = await createStaff(businessId, {
      name: "Empleada Activable",
      email: `empleada-activable-${Date.now()}@example.com`,
      password: "changeme123",
    });
    staffId = staff.id;

    // Un registro homónimo en otro negocio, para probar que los listados y
    // los toggles no cruzan tenants.
    await createService(otherBusinessId, { name: "Servicio De Otro Negocio", durationMinutes: 30, price: 1000 });
    await createProduct(otherBusinessId, { name: "Producto De Otro Negocio", price: 1000, stock: 5 });
    await createStaff(otherBusinessId, {
      name: "Empleada De Otro Negocio",
      email: `empleada-otro-negocio-${Date.now()}@example.com`,
      password: "changeme123",
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { businessId: { in: [businessId, otherBusinessId] } } });
    await prisma.product.deleteMany({ where: { businessId: { in: [businessId, otherBusinessId] } } });
    await prisma.service.deleteMany({ where: { businessId: { in: [businessId, otherBusinessId] } } });
    await prisma.business.deleteMany({ where: { id: { in: [businessId, otherBusinessId] } } });
    await prisma.$disconnect();
  });

  it("listAllServices/listAllProducts/listAllStaff solo devuelven registros del negocio pedido", async () => {
    const services = await listAllServices(businessId);
    expect(services.map((s) => s.id)).toContain(serviceId);
    expect(services.every((s) => s.name !== "Servicio De Otro Negocio")).toBe(true);

    const products = await listAllProducts(businessId);
    expect(products.map((p) => p.id)).toContain(productId);
    expect(products.every((p) => p.name !== "Producto De Otro Negocio")).toBe(true);

    const staff = await listAllStaff(businessId);
    expect(staff.map((s) => s.id)).toContain(staffId);
    expect(staff.every((s) => s.name !== "Empleada De Otro Negocio")).toBe(true);
  });

  it("setServiceActive desactiva y reactiva un servicio del negocio correcto", async () => {
    const deactivated = await setServiceActive(businessId, serviceId, false);
    expect(deactivated.active).toBe(false);
    const reactivated = await setServiceActive(businessId, serviceId, true);
    expect(reactivated.active).toBe(true);
  });

  it("setServiceActive falla si el servicio pertenece a otro negocio", async () => {
    await expect(setServiceActive(otherBusinessId, serviceId, false)).rejects.toThrow();
  });

  it("setProductActive desactiva y reactiva un producto del negocio correcto", async () => {
    const deactivated = await setProductActive(businessId, productId, false);
    expect(deactivated.active).toBe(false);
    const reactivated = await setProductActive(businessId, productId, true);
    expect(reactivated.active).toBe(true);
  });

  it("setProductActive falla si el producto pertenece a otro negocio", async () => {
    await expect(setProductActive(otherBusinessId, productId, false)).rejects.toThrow();
  });

  it("setStaffActive desactiva y reactiva a un empleado del negocio correcto", async () => {
    const deactivated = await setStaffActive(businessId, staffId, false);
    expect(deactivated.active).toBe(false);
    const reactivated = await setStaffActive(businessId, staffId, true);
    expect(reactivated.active).toBe(true);
  });

  it("setStaffActive falla si el empleado pertenece a otro negocio", async () => {
    await expect(setStaffActive(otherBusinessId, staffId, false)).rejects.toThrow();
  });

  it("updateBusinessProfile actualiza descripción y dirección, y los vacíos se guardan como null", async () => {
    const updated = await updateBusinessProfile(businessId, {
      description: "Un spa de prueba",
      address: "Calle Falsa 123",
    });
    expect(updated.description).toBe("Un spa de prueba");
    expect(updated.address).toBe("Calle Falsa 123");

    const cleared = await updateBusinessProfile(businessId, { description: "", address: "" });
    expect(cleared.description).toBeNull();
    expect(cleared.address).toBeNull();
  });

  it("updateBusinessProfile no toca el negocio de otro tenant", async () => {
    await updateBusinessProfile(businessId, { description: "Descripción A", address: "Dirección A" });
    const otherBefore = await prisma.business.findUnique({ where: { id: otherBusinessId } });
    expect(otherBefore?.description).not.toBe("Descripción A");
  });

  it("updateBusinessProfile rechaza una descripción o dirección demasiado larga aunque el caller no valide", async () => {
    await expect(
      updateBusinessProfile(businessId, { description: "a".repeat(801) })
    ).rejects.toThrow(/demasiado larg/);
    await expect(
      updateBusinessProfile(businessId, { address: "a".repeat(301) })
    ).rejects.toThrow(/demasiado larg/);
  });

  it("updateSlackWebhook rechaza una URL demasiado larga o que no sea de Slack aunque el caller no valide", async () => {
    await expect(
      updateSlackWebhook(businessId, `https://hooks.slack.com/${"a".repeat(500)}`)
    ).rejects.toThrow(/demasiado larg/);
    await expect(updateSlackWebhook(businessId, "https://evil.example.com/webhook")).rejects.toThrow(
      /Incoming Webhook de Slack/
    );
  });

  it("updateCancellationPolicy rechaza un texto demasiado largo aunque el caller no valide", async () => {
    await expect(updateCancellationPolicy(businessId, "a".repeat(1001))).rejects.toThrow(
      /demasiado larg/
    );
  });
});
