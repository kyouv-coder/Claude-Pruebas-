import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { assertFiniteAmount, assertMaxLength } from "@/lib/validation";

// Mismo motivo que en pos.ts/finance.ts (sellProduct, redeemGiftCard,
// createExpense): la acción del formulario ya valida esto, pero estas
// funciones no deberían confiar en que el único caller lo haga bien —
// "Infinity" o un precio/duración/stock negativo se guardarían tal cual.
function assertValidPrice(price: number) {
  assertFiniteAmount(price, "El precio", { allowZero: true });
}

function assertValidDuration(durationMinutes: number) {
  if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
    throw new Error("La duración debe ser un número entero mayor a 0.");
  }
}

function assertValidStock(stock: number) {
  if (!Number.isInteger(stock) || stock < 0) {
    throw new Error("El stock debe ser un número entero mayor o igual a 0.");
  }
}

// Mismo motivo que assertValidPrice/assertValidDuration/assertValidStock en
// este archivo: las acciones de Configuración ya limitan el largo de
// nombre/descripción/email, pero estas funciones no deberían confiar en que
// el único caller lo haga bien — un valor gigante llegado por otro camino se
// guardaría tal cual, igual que ya se corrigió antes en createBooking y
// sellGiftCard para los mismos campos.
function assertValidName(name: string) {
  assertMaxLength(name, 150, "El nombre");
}

function assertValidDescription(description: string) {
  assertMaxLength(description, 800, "La descripción");
}

function assertValidEmail(email: string) {
  assertMaxLength(email, 255, "El email");
}

export async function listAllServices(businessId: string) {
  return prisma.service.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    omit: { imageData: true },
  });
}

export async function createService(
  businessId: string,
  input: {
    name: string;
    description?: string;
    durationMinutes: number;
    price: number;
  }
) {
  assertValidName(input.name);
  if (input.description) assertValidDescription(input.description);
  assertValidDuration(input.durationMinutes);
  assertValidPrice(input.price);
  return prisma.service.create({
    data: {
      businessId,
      name: input.name,
      description: input.description || null,
      durationMinutes: input.durationMinutes,
      price: input.price,
    },
  });
}

export async function updateService(
  businessId: string,
  id: string,
  input: {
    name: string;
    description?: string;
    durationMinutes: number;
    price: number;
  }
) {
  assertValidName(input.name);
  if (input.description) assertValidDescription(input.description);
  assertValidDuration(input.durationMinutes);
  assertValidPrice(input.price);
  return prisma.service.update({
    where: { id, businessId },
    data: {
      name: input.name,
      description: input.description || null,
      durationMinutes: input.durationMinutes,
      price: input.price,
    },
  });
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

// El "type" del archivo lo elige quien sube el archivo (el atributo `.type`
// de un File en el navegador, parte del propio request) — no confiable por
// sí solo, mismo motivo que el resto de las validaciones de esta app no
// confían en que el caller ya validó todo. Alguien podía subir cualquier
// archivo (ej. un script) con la extensión y el `Content-Type` de una
// imagen, y quedaba guardado y servido igual porque solo se miraba ese
// campo declarado. Ahora también se chequean los primeros bytes reales del
// archivo (la "firma" del formato) contra el tipo declarado.
function matchesDeclaredImageSignature(type: string, data: Buffer): boolean {
  if (data.byteLength < 12) return false;
  if (type === "image/jpeg") {
    return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (type === "image/png") {
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return pngSignature.every((byte, i) => data[i] === byte);
  }
  if (type === "image/webp") {
    return (
      data.subarray(0, 4).toString("ascii") === "RIFF" &&
      data.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

function assertValidImage(file: { type: string; data: Buffer }) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Solo se aceptan imágenes JPG, PNG o WebP.");
  }
  if (file.data.byteLength > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("La imagen no puede pesar más de 4 MB.");
  }
  if (!matchesDeclaredImageSignature(file.type, file.data)) {
    throw new Error("El archivo no parece ser una imagen válida del tipo indicado.");
  }
}

export async function setServiceImage(
  businessId: string,
  id: string,
  file: { type: string; data: Buffer }
) {
  assertValidImage(file);
  await prisma.service.findFirstOrThrow({ where: { id, businessId } });
  return prisma.service.update({
    where: { id },
    data: { imageData: file.data, imageMimeType: file.type },
  });
}

export async function getServiceImage(businessId: string, id: string) {
  const service = await prisma.service.findFirst({
    where: { id, businessId },
    select: { imageData: true, imageMimeType: true },
  });
  if (!service?.imageData || !service.imageMimeType) return null;
  return { data: service.imageData, mimeType: service.imageMimeType };
}

export async function updateBusinessProfile(
  businessId: string,
  input: { description?: string; address?: string }
) {
  // Mismo motivo que saveBusinessHours: la acción del formulario ya limita
  // el largo, pero esta función no debería confiar en eso — la dirección se
  // muestra prominente en la página pública de reserva y sin este chequeo
  // acá un valor gigante se guardaría tal cual.
  if (input.description) assertMaxLength(input.description, 800, "La descripción");
  if (input.address) assertMaxLength(input.address, 300, "La dirección");
  return prisma.business.update({
    where: { id: businessId },
    data: {
      description: input.description || null,
      address: input.address || null,
    },
  });
}

export async function setBusinessCoverImage(
  businessId: string,
  file: { type: string; data: Buffer }
) {
  assertValidImage(file);
  return prisma.business.update({
    where: { id: businessId },
    data: { coverImageData: file.data, coverImageMimeType: file.type },
  });
}

export async function getBusinessCoverImage(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { coverImageData: true, coverImageMimeType: true },
  });
  if (!business?.coverImageData || !business.coverImageMimeType) return null;
  return { data: business.coverImageData, mimeType: business.coverImageMimeType };
}

export async function setServiceActive(businessId: string, id: string, active: boolean) {
  return prisma.service.update({ where: { id, businessId }, data: { active } });
}

export async function listAllProducts(businessId: string) {
  return prisma.product.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    omit: { imageData: true },
  });
}

export async function createProduct(
  businessId: string,
  input: { name: string; description?: string; price: number; stock: number }
) {
  assertValidName(input.name);
  if (input.description) assertValidDescription(input.description);
  assertValidPrice(input.price);
  assertValidStock(input.stock);
  return prisma.product.create({
    data: {
      businessId,
      name: input.name,
      description: input.description || null,
      price: input.price,
      stock: input.stock,
    },
  });
}

export async function updateProduct(
  businessId: string,
  id: string,
  input: { name: string; description?: string; price: number; stock: number }
) {
  assertValidName(input.name);
  if (input.description) assertValidDescription(input.description);
  assertValidPrice(input.price);
  assertValidStock(input.stock);
  return prisma.product.update({
    where: { id, businessId },
    data: {
      name: input.name,
      description: input.description || null,
      price: input.price,
      stock: input.stock,
    },
  });
}

export async function setProductActive(businessId: string, id: string, active: boolean) {
  return prisma.product.update({ where: { id, businessId }, data: { active } });
}

export async function setProductImage(
  businessId: string,
  id: string,
  file: { type: string; data: Buffer }
) {
  assertValidImage(file);
  await prisma.product.findFirstOrThrow({ where: { id, businessId } });
  return prisma.product.update({
    where: { id },
    data: { imageData: file.data, imageMimeType: file.type },
  });
}

export async function getProductImage(businessId: string, id: string) {
  const product = await prisma.product.findFirst({
    where: { id, businessId },
    select: { imageData: true, imageMimeType: true },
  });
  if (!product?.imageData || !product.imageMimeType) return null;
  return { data: product.imageData, mimeType: product.imageMimeType };
}

export async function updateSlackWebhook(businessId: string, url: string | null) {
  // Mismo motivo que updateBusinessProfile: la acción ya valida el largo y
  // el prefijo, pero esta función no debería confiar en el único caller.
  if (url) {
    assertMaxLength(url, 500, "La URL");
    if (!url.startsWith("https://hooks.slack.com/")) {
      throw new Error(
        "Tiene que ser una URL de Incoming Webhook de Slack (empieza con https://hooks.slack.com/)."
      );
    }
  }
  return prisma.business.update({
    where: { id: businessId },
    data: { slackWebhookUrl: url },
  });
}

export async function updateCancellationPolicy(businessId: string, policy: string | null) {
  if (policy) assertMaxLength(policy, 1000, "El texto");
  return prisma.business.update({
    where: { id: businessId },
    data: { cancellationPolicy: policy },
  });
}

export async function listAllStaff(businessId: string) {
  return prisma.user.findMany({
    where: { businessId, role: "STAFF" },
    orderBy: { name: "asc" },
  });
}

export async function createStaff(
  businessId: string,
  input: { name: string; email: string; password: string }
) {
  assertValidName(input.name);
  assertValidEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      businessId,
      name: input.name,
      // El email es @unique en el modelo y el login busca por coincidencia
      // exacta (case-sensitive en Postgres) — sin normalizar acá, cargar
      // "Maria@Spa.com" no choca con un duplicado real "maria@spa.com" (la
      // restricción única no lo detecta) y esa persona no puede loguearse
      // tipeando su email en minúscula, que es lo más natural.
      email: input.email.toLowerCase(),
      role: "STAFF",
      passwordHash,
    },
  });
}

export async function updateStaff(
  businessId: string,
  id: string,
  input: { name: string; email: string }
) {
  assertValidName(input.name);
  assertValidEmail(input.email);
  return prisma.user.update({
    where: { id, businessId },
    data: { name: input.name, email: input.email.toLowerCase() },
  });
}

export async function setStaffActive(businessId: string, id: string, active: boolean) {
  return prisma.user.update({ where: { id, businessId }, data: { active } });
}
