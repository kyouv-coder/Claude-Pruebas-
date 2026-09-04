import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function listAllServices() {
  return prisma.service.findMany({ orderBy: { name: "asc" } });
}

export async function createService(input: {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
}) {
  return prisma.service.create({
    data: {
      name: input.name,
      description: input.description || null,
      durationMinutes: input.durationMinutes,
      price: input.price,
    },
  });
}

export async function updateService(
  id: string,
  input: {
    name: string;
    description?: string;
    durationMinutes: number;
    price: number;
  }
) {
  return prisma.service.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description || null,
      durationMinutes: input.durationMinutes,
      price: input.price,
    },
  });
}

export async function setServiceActive(id: string, active: boolean) {
  return prisma.service.update({ where: { id }, data: { active } });
}

export async function listAllStaff() {
  return prisma.user.findMany({
    where: { role: "STAFF" },
    orderBy: { name: "asc" },
  });
}

export async function createStaff(input: { name: string; email: string }) {
  // No login system yet — this is a placeholder until real auth exists.
  return prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: "STAFF",
      passwordHash: randomUUID(),
    },
  });
}

export async function updateStaff(
  id: string,
  input: { name: string; email: string }
) {
  return prisma.user.update({
    where: { id },
    data: { name: input.name, email: input.email },
  });
}

export async function setStaffActive(id: string, active: boolean) {
  return prisma.user.update({ where: { id }, data: { active } });
}
