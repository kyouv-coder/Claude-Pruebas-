import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

// Borra las reservas/ventas/giftcards/gastos demo del negocio (no el negocio
// ni sus usuarios) para poder volver a correr `npm run db:seed:demo` con
// datos nuevos, sin arrastrar reservas viejas de una corrida anterior.

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@spa.local";

async function main() {
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: ADMIN_EMAIL } });
  const businessId = admin.businessId;

  const bookings = await prisma.booking.findMany({ where: { businessId }, select: { id: true } });
  const bookingIds = bookings.map((b) => b.id);

  await prisma.giftCardTransaction.deleteMany({ where: { giftCard: { businessId } } });
  await prisma.giftCard.deleteMany({ where: { businessId } });
  await prisma.saleItem.deleteMany({ where: { sale: { businessId } } });
  await prisma.sale.deleteMany({ where: { businessId } });
  await prisma.bookingProductRequest.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.booking.deleteMany({ where: { businessId } });
  await prisma.cashRegisterSession.deleteMany({ where: { businessId } });
  await prisma.expense.deleteMany({ where: { businessId } });

  console.log("Datos demo (reservas, ventas, caja, giftcards, gastos) borrados. Corré `npm run db:seed:demo` para cargar los nuevos.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
