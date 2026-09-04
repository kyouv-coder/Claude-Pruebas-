import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function listAllServices(businessId: string) {
  return prisma.service.findMany({ where: { businessId }, orderBy: { name: "asc" } });
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
