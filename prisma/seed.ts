import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

const BUSINESS_NAME = process.env.SEED_BUSINESS_NAME || "Spa Demo";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@spa.local";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "changeme123";
const STAFF_PASSWORD = process.env.SEED_STAFF_PASSWORD || "changeme123";

async function main() {
  const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  });

  const business = existingAdmin
    ? await prisma.business.findUniqueOrThrow({
        where: { id: existingAdmin.businessId },
      })
    : await prisma.business.create({ data: { name: BUSINESS_NAME } });

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash: adminPasswordHash },
    create: {
      businessId: business.id,
      name: "Administración",
      email: ADMIN_EMAIL,
      passwordHash: adminPasswordHash,
      role: "ADMIN",
    },
  });

  const staffPasswordHash = await bcrypt.hash(STAFF_PASSWORD, 10);

  const staff = await prisma.user.upsert({
    where: { email: "staff@spa.local" },
    update: { passwordHash: staffPasswordHash },
    create: {
      businessId: business.id,
      name: "Terapeuta Principal",
      email: "staff@spa.local",
      passwordHash: staffPasswordHash,
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
        where: { businessId_name: { businessId: business.id, name: s.name } },
        update: {},
        create: { ...s, businessId: business.id },
      })
    )
  );

  console.log({
    business: business.name,
    admin: admin.email,
    adminPassword: process.env.SEED_ADMIN_PASSWORD
      ? "(definida por SEED_ADMIN_PASSWORD)"
      : ADMIN_PASSWORD,
    staff: staff.email,
    staffPassword: process.env.SEED_STAFF_PASSWORD
      ? "(definida por SEED_STAFF_PASSWORD)"
      : STAFF_PASSWORD,
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
