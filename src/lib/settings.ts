import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

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

function assertValidImage(file: { type: string; data: Buffer }) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Solo se aceptan imágenes JPG, PNG o WebP.");
  }
  if (file.data.byteLength > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("La imagen no puede pesar más de 4 MB.");
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
  return prisma.product.findMany({ where: { businessId }, orderBy: { name: "asc" } });
}

export async function createProduct(
  businessId: string,
  input: { name: string; price: number; stock: number }
) {
  return prisma.product.create({
    data: { businessId, name: input.name, price: input.price, stock: input.stock },
  });
}

export async function updateProduct(
  businessId: string,
  id: string,
  input: { name: string; price: number; stock: number }
) {
  return prisma.product.update({
    where: { id, businessId },
    data: { name: input.name, price: input.price, stock: input.stock },
  });
}

export async function setProductActive(businessId: string, id: string, active: boolean) {
  return prisma.product.update({ where: { id, businessId }, data: { active } });
}

export async function updateSlackWebhook(businessId: string, url: string | null) {
  return prisma.business.update({
    where: { id: businessId },
    data: { slackWebhookUrl: url },
  });
}

export async function updateCancellationPolicy(businessId: string, policy: string | null) {
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
  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      businessId,
      name: input.name,
      email: input.email,
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
  return prisma.user.update({
    where: { id, businessId },
    data: { name: input.name, email: input.email },
  });
}

export async function setStaffActive(businessId: string, id: string, active: boolean) {
  return prisma.user.update({ where: { id, businessId }, data: { active } });
}
