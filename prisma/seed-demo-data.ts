import "dotenv/config";
import { PrismaClient, type ExpenseCategory } from "../src/generated/prisma";

const prisma = new PrismaClient();

// Carga reservas, ventas, giftcards, gastos, comprobantes y fotos ficticias
// del último año para el negocio demo (el que crea prisma/seed.ts), así se
// puede recorrer el panel completo (caja, reservas, giftcards, dashboard,
// finanzas, página pública) con datos realistas — meses buenos, meses
// flojos, gastos extra — en vez de una cuenta vacía o un único mes plano.
// No toca nada de producción: solo corre contra la DATABASE_URL que tengas
// configurada localmente.

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@spa.local";

const now = new Date();

// Últimos 12 meses (incluyendo el actual), como pares {year, month} para
// manejar bien el cambio de año.
const MONTHS_BACK = 12;
const MONTHS = Array.from({ length: MONTHS_BACK }, (_, i) => {
  const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1 - i), 1);
  return { year: d.getFullYear(), month: d.getMonth() };
});

// Factor de intensidad del negocio por mes (0 = mes más flojo del año,
// hace unos meses hubo un mes malo con reparación imprevista; el resto de
// meses varía como estacionalidad normal, terminando fuerte en el actual).
const MONTH_FACTORS = [0.85, 0.95, 1.05, 0.55, 1.1, 1.2, 0.8, 1.0, 1.15, 0.75, 1.05, 1.1];
const BAD_MONTH_INDEX = 3; // el mes con el factor más bajo

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

// Fotos genéricas de producto/servicio/portada: un SVG simple con el nombre,
// generado localmente (sin depender de internet), para que el prototipo se
// vea con imagen en vez de placeholders vacíos.
function placeholderImage(label: string, bg: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
<rect width="640" height="480" fill="${bg}"/>
<text x="50%" y="50%" font-family="Arial, sans-serif" font-size="36" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text>
</svg>`;
  return { data: Buffer.from(svg), mimeType: "image/svg+xml" };
}

// PNG 1x1 válido, usado como "comprobante escaneado" ficticio adjunto a
// algunas ventas (attachSaleInvoice solo acepta JPEG/PNG/PDF).
const PLACEHOLDER_INVOICE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);

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

  const earliest = MONTHS[0];
  const existingDemoBooking = await prisma.booking.findFirst({
    where: {
      businessId: business.id,
      startTime: { gte: new Date(earliest.year, earliest.month, 1) },
    },
  });
  if (existingDemoBooking) {
    console.log(
      `Ya hay reservas demo cargadas para "${business.name}" — no se vuelve a correr para no duplicar. Corré \`npm run db:reset-demo\` primero si querés datos nuevos.`
    );
    return;
  }

  console.log(`Cargando datos de demo (último año) para "${business.name}"...`);

  // Perfil del negocio para que la página pública se vea completa
  const cover = placeholderImage(business.name, "#1a1a1a");
  await prisma.business.update({
    where: { id: business.id },
    data: {
      description:
        "Un espacio de bienestar pensado para desconectar del día a día. Terapeutas certificados, productos naturales y ambientación cuidada en cada detalle.",
      address: "Av. Providencia 1234, Providencia, Santiago",
      coverImageData: cover.data,
      coverImageMimeType: cover.mimeType,
    },
  });

  // Descripciones + fotos genéricas para los servicios ya creados por seed.ts
  const serviceDetails: Record<string, string> = {
    "Masaje relajante": "Masaje de cuerpo completo con aceites esenciales, ideal para liberar tensión y estrés acumulado.",
    "Limpieza facial": "Limpieza profunda con extracción, exfoliación e hidratación para dejar la piel renovada.",
    "Masaje descontracturante": "Trabajo profundo en zonas de tensión (cuello, espalda, hombros) para aliviar contracturas.",
  };
  for (const s of services) {
    const img = placeholderImage(s.name, pick(["#2d2d2d", "#3a3a3a", "#242424"]));
    await prisma.service.update({
      where: { id: s.id },
      data: {
        description: serviceDetails[s.name] ?? "Servicio de spa realizado por profesionales certificados.",
        imageData: img.data,
        imageMimeType: img.mimeType,
      },
    });
  }
  // Un cuarto servicio genérico más, para variedad
  const manicure = await prisma.service.upsert({
    where: { businessId_name: { businessId: business.id, name: "Manicure spa" } },
    update: {},
    create: {
      businessId: business.id,
      name: "Manicure spa",
      description: "Manicure completa con hidratación de manos y esmaltado a elección.",
      durationMinutes: 40,
      price: 9000,
    },
  });
  {
    const img = placeholderImage(manicure.name, "#333333");
    await prisma.service.update({
      where: { id: manicure.id },
      data: { imageData: img.data, imageMimeType: img.mimeType },
    });
  }
  const allServices = await prisma.service.findMany({ where: { businessId: business.id, active: true } });

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

  // Productos con foto y descripción, para vender en caja y mostrar en la página pública
  const productDefs = [
    { name: "Aceite esencial de lavanda", price: 8000, stock: 30, description: "Aceite 100% natural, ideal para relajación y masajes en casa." },
    { name: "Vela aromática", price: 6000, stock: 25, description: "Vela de soya con aroma a sándalo y vainilla, aporta un ambiente cálido y relajante." },
    { name: "Mascarilla facial hidratante", price: 7500, stock: 20, description: "Mascarilla con ácido hialurónico para hidratación profunda, uso semanal." },
    { name: "Kit de manicure spa", price: 12000, stock: 15, description: "Kit con lima, aceite de cutícula y crema de manos para cuidado en casa." },
  ];
  const products = [];
  for (const p of productDefs) {
    const product = await prisma.product.upsert({
      where: { businessId_name: { businessId: business.id, name: p.name } },
      update: {},
      create: { businessId: business.id, name: p.name, price: p.price, stock: p.stock, description: p.description },
    });
    const img = placeholderImage(p.name, pick(["#404040", "#4a4a4a", "#363636"]));
    await prisma.product.update({
      where: { id: product.id },
      data: { imageData: img.data, imageMimeType: img.mimeType },
    });
    products.push(product);
  }

  const slots = ["10:00", "11:15", "14:00", "15:30", "17:00"];
  let bookingsCreated = 0;
  let salesCreated = 0;
  let invoicesAttached = 0;

  for (let mi = 0; mi < MONTHS.length; mi++) {
    const { year, month } = MONTHS[mi];
    const factor = MONTH_FACTORS[mi] ?? 1.0;
    const isBadMonth = mi === BAD_MONTH_INDEX;
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lastDay = isCurrentMonth ? now.getDate() : daysInMonth;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const weekday = date.getDay();
      if (weekday === 0) continue; // domingo cerrado

      const isFuture = isCurrentMonth && day > lastDay;
      if (isFuture && day > lastDay + 10) continue; // no llenar demasiado a futuro
      const isPast = !isFuture;

      // Menos turnos disponibles cuanto más bajo el factor del mes (mes
      // flojo = agenda con más huecos, no solo menos ventas).
      const dailySlots = (weekday === 6 ? slots.slice(0, 3) : slots).filter(
        () => Math.random() < Math.min(1, factor + 0.15)
      );

      // Caja del día, solo para días pasados
      let cashSessionId: string | null = null;
      if (isPast) {
        const opening = 20000;
        const session = await prisma.cashRegisterSession.create({
          data: {
            businessId: business.id,
            openedById: admin.id,
            openedAt: new Date(year, month, day, 9, 30),
            openingAmount: opening,
          },
        });
        cashSessionId = session.id;
      }

      for (const slot of dailySlots) {
        const [h, m] = slot.split(":").map(Number);
        const staff = pick(staffMembers);
        const service = pick(allServices);
        const client = pick(clients);
        const startTime = new Date(year, month, day, h, m);
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
          // Mes malo: más cancelaciones y ausencias que lo normal.
          const noShowCutoff = isBadMonth ? 0.16 : 0.08;
          const cancelCutoff = isBadMonth ? 0.32 : 0.15;
          status = roll < noShowCutoff ? "NO_SHOW" : roll < cancelCutoff ? "CANCELLED" : "COMPLETED";
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
          const sale = await prisma.sale.create({
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

          // ~40% de las ventas quedan con el comprobante ya escaneado y
          // subido, como haría la dueña del negocio en la vida real.
          if (Math.random() < 0.4) {
            await prisma.sale.update({
              where: { id: sale.id },
              data: {
                invoiceFileName: `comprobante-${sale.id.slice(-6)}.png`,
                invoiceMimeType: "image/png",
                invoiceFileData: PLACEHOLDER_INVOICE_PNG,
                invoiceUploadedAt: new Date(startTime.getTime() + 2 * 60 * 60_000),
              },
            });
            invoicesAttached++;
          }
        }
      }

      // Alguna venta de producto suelta en días pasados (menos frecuente en el mes malo)
      if (isPast && cashSessionId && Math.random() < 0.4 * factor) {
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
            closedAt: new Date(year, month, day, 20, 0),
            closingAmount: cashTotal,
            expectedCashAmount: cashTotal,
          },
        });
      }
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

  // Gastos de cada mes (el mes malo trae además una reparación imprevista)
  const expenseTemplates: Array<{ day: number; category: ExpenseCategory; description: string; amount: number }> = [
    { day: 1, category: "ALQUILER", description: "Arriendo local", amount: 450000 },
    { day: 5, category: "INSUMOS", description: "Aceites y toallas", amount: 65000 },
    { day: 15, category: "SERVICIOS", description: "Luz y agua", amount: 38000 },
    { day: 30, category: "SUELDOS", description: "Sueldo terapeuta", amount: 380000 },
  ];
  let expensesCreated = 0;
  for (let mi = 0; mi < MONTHS.length; mi++) {
    const { year, month } = MONTHS[mi];
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rows = expenseTemplates.map((e) => ({
      businessId: business.id,
      date: new Date(year, month, Math.min(e.day, daysInMonth)),
      category: e.category,
      description: e.description,
      // Insumos varía un poco con la intensidad del mes.
      amount: e.category === "INSUMOS" ? Math.round(e.amount * (MONTH_FACTORS[mi] ?? 1)) : e.amount,
    }));
    if (mi === BAD_MONTH_INDEX) {
      rows.push({
        businessId: business.id,
        date: new Date(year, month, 12),
        category: "OTRO",
        description: "Reparación de camilla y aire acondicionado",
        amount: 210000,
      });
    }
    await prisma.expense.createMany({ data: rows });
    expensesCreated += rows.length;
  }

  console.log({
    clientes: clients.length,
    servicios: allServices.length,
    productos: products.length,
    reservas: bookingsCreated,
    ventas: salesCreated,
    comprobantesSubidos: invoicesAttached,
    giftcards: 2,
    gastos: expensesCreated,
    mesMalo: MONTHS[BAD_MONTH_INDEX] ? `${MONTHS[BAD_MONTH_INDEX].month + 1}/${MONTHS[BAD_MONTH_INDEX].year}` : null,
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
