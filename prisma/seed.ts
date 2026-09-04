import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@spa.local" },
    update: {},
    create: {
      name: "Administración",
      email: "admin@spa.local",
      passwordHash: "changeme",
      role: "ADMIN",
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@spa.local" },
    update: {},
    create: {
      name: "Terapeuta Principal",
      email: "staff@spa.local",
      passwordHash: "changeme",
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

  console.log({ admin: admin.email, staff: staff.email, services: services.map((s) => s.name) });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
