import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

// Carga reservas, ventas, giftcards y gastos ficticios de septiembre para el
// negocio demo (el que crea prisma/seed.ts), así se puede recorrer el panel
// completo (caja, reservas, giftcards, dashboard, finanzas) con datos
// realistas en vez de una cuenta vacía. No toca nada de producción: solo
// corre contra la DATABASE_URL que tengas configurada localmente.

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@spa.local";

const YEAR = new Date().getFullYear();
const MONTH = 8; // septiembre (0-indexed)

const CLIENTS = [
  { name: "Camila Rojas", phone: "+56911111111" },
  { name: "Matías Fuentes", phone: "+56911111112" },
  { name: "Javiera Soto", phone: "+56911111113" },
  { name: "Benjamín Muñoz", phone: "+56911111114" },
  { name: "Antonia Vergara", phone: "+56911111115" },
  { name: "Diego Contreras", phone: "+56911111116" },
  { name: "Florencia Reyes", phone: "+56911111117" },
  { name: "Tomás Espinoza", phone: "+56911111118" },
  { name: "Isidora Castro", phone: "+56911111119" },
  { name: "Vicente Araya", phone: "+56911111120" },
  { name: "Constanza Silva", phone: "+56911111121" },
  { name: "Joaquín Torres", phone: "+56911111122" },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: ADMIN_EMAIL },
    include: { business: true },
  });
  const business = admin.business;

  const staffMembers = await prisma.user.findMany({ where: { businessId: business.id } });
  const services = await prisma.service.findMany({ where: { businessId: business.id } });
  if (services.length === 0 || staffMembers.length === 0) {
    throw new Error("Corré primero `npm run db:seed` para crear el negocio base.");
  }

  const existingDemoBooking = await prisma.booking.findFirst({
    where: {
      businessId: business.id,
      startTime: { gte: new Date(YEAR, MONTH, 1), lt: new Date(YEAR, MONTH + 1, 1) },
    },
  });
  if (existingDemoBooking) {
    console.log(
      `Ya hay reservas cargadas para septiembre ${YEAR} en "${business.name}" — no se vuelve a correr para no duplicar. Si querés datos nuevos, borrá primero las reservas de ese mes.`
    );
    return;
  }

  console.log(`Cargando datos de demo de septiembre ${YEAR} para "${business.name}"...`);

  // Clientes
  const clients = [];
  for (const c of CLIENTS) {
    const client = await prisma.client.upsert({
      where: { businessId_email: { businessId: business.id, email: `${c.name.split(" ")[0].toLowerCase()}@example.com` } },
      update: {},
      create: {
        businessId: business.id,
        name: c.name,
        phone: c.phone,
        email: `${c.name.split(" ")[0].toLowerCase()}@example.com`,
      },
    });
    clients.push(client);
  }

  // Un par de productos para vender en caja
  const products = await Promise.all(
    [
      { name: "Aceite esencial de lavanda", price: 8000, stock: 30 },
      { name: "Vela aromática", price: 6000, stock: 25 },
    ].map((p) =>
      prisma.product.upsert({
        where: { businessId_name: { businessId: business.id, name: p.name } },
        update: {},
        create: { ...p, businessId: business.id },
      })
    )
  );

  const now = new Date();
  const slots = ["10:00", "11:15", "14:00", "15:30", "17:00"];
  let bookingsCreated = 0;
  let salesCreated = 0;

  for (let day = 1; day <= 30; day++) {
    const date = new Date(YEAR, MONTH, day);
    const weekday = date.getDay();
    if (weekday === 0) continue; // domingo cerrado

    const isPast = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dailySlots = weekday === 6 ? slots.slice(0, 3) : slots; // sábado más corto

    // Caja del día, solo para días pasados (los futuros no tienen caja abierta todavía)
    let cashSessionId: string | null = null;
    if (isPast) {
      const opening = 20000;
      const session = await prisma.cashRegisterSession.create({
        data: {
          businessId: business.id,
          openedById: admin.id,
          openedAt: new Date(YEAR, MONTH, day, 9, 30),
          openingAmount: opening,
        },
      });
      cashSessionId = session.id;
    }

    for (const slot of dailySlots) {
      const [h, m] = slot.split(":").map(Number);
      const staff = pick(staffMembers);
      const service = pick(services);
      const client = pick(clients);
      const startTime = new Date(YEAR, MONTH, day, h, m);
      const endTime = new Date(startTime.getTime() + service.durationMinutes * 60000);

      // Evitar choques si dos slots random cayeron con el mismo staff/hora
      const overlap = await prisma.booking.findFirst({
        where: {
          staffId: staff.id,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });
      if (overlap) continue;

      let status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW" = "CONFIRMED";
      if (isPast) {
        const roll = Math.random();
        status = roll < 0.08 ? "NO_SHOW" : roll < 0.15 ? "CANCELLED" : "COMPLETED";
      } else {
        status = Math.random() < 0.5 ? "CONFIRMED" : "PENDING";
      }

      const booking = await prisma.booking.create({
        data: {
          businessId: business.id,
          clientId: client.id,
          serviceId: service.id,
          staffId: staff.id,
          startTime,
          endTime,
          status,
        },
      });
      bookingsCreated++;

      if (status === "COMPLETED" && cashSessionId) {
        const paymentMethod = pick(["CASH", "CARD", "TRANSFER"] as const);
        await prisma.sale.create({
          data: {
            businessId: business.id,
            clientId: client.id,
            bookingId: booking.id,
            cashSessionId,
            total: service.price,
            paymentMethod,
            items: {
              create: [{ description: service.name, quantity: 1, unitPrice: service.price }],
            },
          },
        });
        salesCreated++;
      }
    }

    // Alguna venta de producto suelta en días pasados
    if (isPast && cashSessionId && Math.random() < 0.4) {
      const product = pick(products);
      const quantity = randomInt(1, 2);
      await prisma.sale.create({
        data: {
          businessId: business.id,
          clientId: pick(clients).id,
          cashSessionId,
          total: Number(product.price) * quantity,
          paymentMethod: pick(["CASH", "CARD"] as const),
          items: {
            create: [
              { productId: product.id, description: product.name, quantity, unitPrice: product.price },
            ],
          },
        },
      });
      salesCreated++;
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: { decrement: quantity } },
      });
    }

    // Cerrar la caja del día con lo recaudado
    if (cashSessionId) {
      const daySales = await prisma.sale.findMany({
        where: { cashSessionId, paymentMethod: "CASH" },
        select: { total: true },
      });
      const cashTotal = daySales.reduce((sum, s) => sum + Number(s.total), 20000);
      await prisma.cashRegisterSession.update({
        where: { id: cashSessionId },
        data: {
          closedAt: new Date(YEAR, MONTH, day, 20, 0),
          closingAmount: cashTotal,
          expectedCashAmount: cashTotal,
        },
      });
    }
  }

  // Giftcards: un par vendidas y parcialmente canjeadas
  const giftCardSession = await prisma.cashRegisterSession.findFirst({
    where: { businessId: business.id, closedAt: { not: null } },
    orderBy: { openedAt: "asc" },
  });
  if (giftCardSession) {
    for (const [i, amount] of [20000, 15000].entries()) {
      const client = clients[i];
      const sale = await prisma.sale.create({
        data: {
          businessId: business.id,
          clientId: client.id,
          cashSessionId: giftCardSession.id,
          total: amount,
          paymentMethod: "CASH",
          items: { create: [{ description: "Giftcard", quantity: 1, unitPrice: amount }] },
        },
      });
      const giftCard = await prisma.giftCard.create({
        data: {
          businessId: business.id,
          code: `GC-DEMO${i}`,
          initialValue: amount,
          balance: amount,
          clientId: client.id,
        },
      });
      await prisma.giftCardTransaction.create({
        data: { giftCardId: giftCard.id, type: "ISSUE", amount, saleId: sale.id },
      });

      if (i === 0) {
        // Canje parcial de la primera
        const redeemAmount = 8000;
        const redeemSale = await prisma.sale.create({
          data: {
            businessId: business.id,
            clientId: client.id,
            cashSessionId: giftCardSession.id,
            total: redeemAmount,
            paymentMethod: "GIFTCARD",
            items: {
              create: [{ description: `Canje giftcard ${giftCard.code}`, quantity: 1, unitPrice: redeemAmount }],
            },
          },
        });
        await prisma.giftCard.update({
          where: { id: giftCard.id },
          data: { balance: amount - redeemAmount },
        });
        await prisma.giftCardTransaction.create({
          data: { giftCardId: giftCard.id, type: "REDEEM", amount: redeemAmount, saleId: redeemSale.id },
        });
      }
    }
  }

  // Gastos del mes
  await prisma.expense.createMany({
    data: [
      { businessId: business.id, date: new Date(YEAR, MONTH, 1), category: "ALQUILER", description: "Arriendo local", amount: 450000 },
      { businessId: business.id, date: new Date(YEAR, MONTH, 5), category: "INSUMOS", description: "Aceites y toallas", amount: 65000 },
      { businessId: business.id, date: new Date(YEAR, MONTH, 15), category: "SERVICIOS", description: "Luz y agua", amount: 38000 },
      { businessId: business.id, date: new Date(YEAR, MONTH, 30), category: "SUELDOS", description: "Sueldo terapeuta", amount: 380000 },
    ],
  });

  console.log({ clientes: clients.length, reservas: bookingsCreated, ventas: salesCreated, giftcards: 2, gastos: 4 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
