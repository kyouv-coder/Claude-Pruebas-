import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@spa.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "changeme123";

async function main() {
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash: adminPasswordHash },
    create: {
      name: "Administración",
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@spa.local" },
    update: {},
    create: {
      name: "Terapeuta Principal",
      email: "staff@spa.local",
      // El staff no inicia sesión (solo ADMIN) — este hash nunca se usa para login.
      passwordHash: await bcrypt.hash(crypto.randomUUID(), 10),
      role: "STAFF",
    },
  });

  const services = await Promise.all(
    [
      { name: "Masaje relajante", durationMinutes: 60, price: 15000 },
      { name: "Limpieza facial", durationMinutes: 45, price: 12000 },
      { name: "Masaje descontracturante", durationMinutes: 50, price: 16000 },
    ].map((s) =>
      prisma.service.upsert({
        where: { name: s.name },
        update: {},
        create: s,
      })
    )
  );

  console.log({
    admin: admin.email,
    adminPassword: process.env.SEED_ADMIN_PASSWORD
      ? "(definida por SEED_ADMIN_PASSWORD)"
      : ADMIN_PASSWORD,
    staff: staff.email,
    services: services.map((s) => s.name),
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
