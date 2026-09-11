import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { PaymentMethod } from "@/generated/prisma";

async function getOperator() {
  const user = await getCurrentUser();
  if (!user) throw new Error("No hay una sesión activa.");
  return user;
}

export async function getOpenCashSession(businessId: string) {
  return prisma.cashRegisterSession.findFirst({
    where: { businessId, closedAt: null },
    orderBy: { openedAt: "desc" },
  });
}

export async function openCashSession(businessId: string, openingAmount: number) {
  const operator = await getOperator();

  const runAttempt = () =>
    prisma.$transaction(
      async (tx) => {
        const alreadyOpen = await tx.cashRegisterSession.findFirst({
          where: { businessId, closedAt: null },
        });
        if (alreadyOpen) {
          throw new Error("Ya hay una caja abierta para este negocio.");
        }
        return tx.cashRegisterSession.create({
          data: { businessId, openedById: operator.id, openingAmount },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

  // Mismo patrón que el chequeo de solapamiento en createBooking
  // (bookings.ts): el chequeo de "no hay caja abierta" y la creación
  // están en una sola transacción serializable, así que dos aperturas
  // simultáneas (doble clic, dos pestañas) no pueden pasar ambas el
  // chequeo antes de que ninguna hubiera insertado todavía — antes,
  // abrir dos veces dejaba una caja huérfana sin forma de cerrarla desde
  // la UI, que solo muestra la más reciente.
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await runAttempt();
    } catch (e) {
      const isSerializationFailure =
        e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034";
      if (!isSerializationFailure || attempt === MAX_ATTEMPTS) {
        if (isSerializationFailure) {
          throw new Error("Ya hay una caja abierta para este negocio.");
        }
        throw e;
      }
    }
  }
  throw new Error("No se pudo abrir la caja. Probá de nuevo.");
}

export async function closeCashSession(
  businessId: string,
  sessionId: string,
  closingAmount: number
) {
  // closedAt: null en el chequeo inicial: sin esto, cerrar una caja que ya
  // estaba cerrada (sessionId viejo reenviado, doble clic) no fallaba —
  // simplemente recalculaba y pisaba en silencio el cierre histórico con
  // otro monto contado.
  const session = await prisma.cashRegisterSession.findFirstOrThrow({
    where: { id: sessionId, businessId, closedAt: null },
  });

  const cashSales = await prisma.sale.findMany({
    where: { businessId, cashSessionId: sessionId, paymentMethod: "CASH" },
    select: { total: true },
  });
  const cashSalesTotal = cashSales.reduce((sum, s) => sum + Number(s.total), 0);
  const expectedCash = Number(session.openingAmount) + cashSalesTotal;
  const difference = closingAmount - expectedCash;

  // Update condicionado (mismo patrón que sellProduct/redeemGiftCard): si
  // dos pestañas cierran la misma caja casi al mismo tiempo, solo una debe
  // ganar — este filtro evita que la segunda pise el cierre que la primera
  // ya escribió.
  const closed = await prisma.cashRegisterSession.updateMany({
    where: { id: sessionId, businessId, closedAt: null },
    data: { closedAt: new Date(), closingAmount, expectedCashAmount: expectedCash },
  });
  if (closed.count === 0) {
    throw new Error("Esta caja ya fue cerrada.");
  }

  const updated = await prisma.cashRegisterSession.findUniqueOrThrow({ where: { id: sessionId } });
  return { session: updated, expectedCash, countedCash: closingAmount, difference };
}

export async function getLastClosedCashSession(businessId: string) {
  return prisma.cashRegisterSession.findFirst({
    where: { businessId, closedAt: { not: null } },
    orderBy: { closedAt: "desc" },
  });
}

export async function getCashSessionSummary(businessId: string, sessionId: string) {
  const sales = await prisma.sale.findMany({
    where: { businessId, cashSessionId: sessionId },
    select: { total: true, paymentMethod: true },
  });
  const total = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const byMethod = sales.reduce<Record<string, number>>((acc, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] ?? 0) + Number(s.total);
    return acc;
  }, {});
  return { salesCount: sales.length, total, byMethod };
}

export async function getTodaysUnpaidBookings(businessId: string) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return prisma.booking.findMany({
    where: {
      businessId,
      startTime: { gte: start, lt: end },
      status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
      sale: null,
    },
    orderBy: { startTime: "asc" },
    include: { client: true, service: true, staff: true },
  });
}

export async function chargeBooking(
  businessId: string,
  bookingId: string,
  cashSessionId: string,
  paymentMethod: PaymentMethod
) {
  const booking = await prisma.booking.findFirstOrThrow({
    where: { id: bookingId, businessId },
    include: { service: true },
  });

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        businessId,
        clientId: booking.clientId,
        bookingId: booking.id,
        cashSessionId,
        total: booking.service.price,
        paymentMethod,
        items: {
          create: [
            {
              description: booking.service.name,
              quantity: 1,
              unitPrice: booking.service.price,
            },
          ],
        },
      },
    });
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "COMPLETED" },
    });
    return sale;
  });
}

export async function listSellableProducts(businessId: string) {
  return prisma.product.findMany({
    where: { businessId, active: true, stock: { gt: 0 } },
    orderBy: { name: "asc" },
  });
}

export async function sellProduct(
  businessId: string,
  input: {
    productId: string;
    quantity: number;
    paymentMethod: PaymentMethod;
    cashSessionId: string;
    clientId?: string;
  }
) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findFirstOrThrow({
      where: { id: input.productId, businessId },
    });

    // Update condicionado (no leer-y-después-escribir): si dos ventas del
    // mismo producto llegan al mismo tiempo, esta consulta es atómica a
    // nivel de base de datos — solo una puede descontar stock que ya no
    // alcanza, evitando dejarlo en negativo.
    const decremented = await tx.product.updateMany({
      where: { id: product.id, businessId, stock: { gte: input.quantity } },
      data: { stock: { decrement: input.quantity } },
    });
    if (decremented.count === 0) {
      throw new Error(`Stock insuficiente. Quedan ${product.stock} unidades.`);
    }

    const sale = await tx.sale.create({
      data: {
        businessId,
        clientId: input.clientId,
        cashSessionId: input.cashSessionId,
        total: Number(product.price) * input.quantity,
        paymentMethod: input.paymentMethod,
        items: {
          create: [
            {
              productId: product.id,
              description: product.name,
              quantity: input.quantity,
              unitPrice: product.price,
            },
          ],
        },
      },
    });

    return sale;
  });
}

function generateGiftCardCode() {
  return `GC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function sellGiftCard(
  businessId: string,
  input: {
    clientName: string;
    clientPhone?: string;
    clientEmail?: string;
    amount: number;
    paymentMethod: PaymentMethod;
    cashSessionId: string;
    expiresAt?: Date;
  }
) {
  return prisma.$transaction(async (tx) => {
    // El cliente se crea en la misma transacción que la venta y la
    // giftcard: si algo después falla (ej. cashSessionId inválido), todo
    // se revierte junto — antes quedaba un cliente fantasma sin giftcard
    // ni venta, creado aparte y nunca limpiado.
    const client = await tx.client.create({
      data: {
        businessId,
        name: input.clientName,
        phone: input.clientPhone || null,
        email: input.clientEmail || null,
      },
    });

    const sale = await tx.sale.create({
      data: {
        businessId,
        clientId: client.id,
        cashSessionId: input.cashSessionId,
        total: input.amount,
        paymentMethod: input.paymentMethod,
        items: {
          create: [
            {
              description: "Giftcard",
              quantity: 1,
              unitPrice: input.amount,
            },
          ],
        },
      },
    });

    const giftCard = await tx.giftCard.create({
      data: {
        businessId,
        code: generateGiftCardCode(),
        initialValue: input.amount,
        balance: input.amount,
        clientId: client.id,
        expiresAt: input.expiresAt ?? null,
      },
    });

    await tx.giftCardTransaction.create({
      data: {
        giftCardId: giftCard.id,
        type: "ISSUE",
        amount: input.amount,
        saleId: sale.id,
      },
    });

    return giftCard;
  });
}

export async function redeemGiftCard(
  businessId: string,
  input: {
    code: string;
    amount: number;
    cashSessionId: string;
  }
) {
  const giftCard = await prisma.giftCard.findFirstOrThrow({
    where: { code: input.code, businessId },
  });

  if (!giftCard.active) throw new Error("La giftcard no está activa");
  // El vencimiento se puede cargar al vender la giftcard, pero nada la
  // desactiva sola cuando llega esa fecha — sin este chequeo, quedaba
  // mostrada como "vencida" en la lista pero se seguía pudiendo canjear
  // igual, vaciando el mensaje de la fecha de vencimiento.
  if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
    throw new Error("La giftcard está vencida");
  }

  return prisma.$transaction(async (tx) => {
    // Update condicionado (mismo patrón que el descuento de stock en
    // sellProduct): si dos canjes de la misma giftcard llegan al mismo
    // tiempo, esta resta es atómica a nivel de base de datos — solo uno
    // puede pasar cuando el saldo ya no alcanza, evitando dejarlo negativo.
    const decremented = await tx.giftCard.updateMany({
      where: { id: giftCard.id, businessId, active: true, balance: { gte: input.amount } },
      data: { balance: { decrement: input.amount } },
    });
    if (decremented.count === 0) {
      throw new Error("Saldo insuficiente en la giftcard");
    }

    const updated = await tx.giftCard.findUniqueOrThrow({ where: { id: giftCard.id } });
    if (Number(updated.balance) <= 0) {
      await tx.giftCard.update({ where: { id: giftCard.id }, data: { active: false } });
    }

    const sale = await tx.sale.create({
      data: {
        businessId,
        clientId: giftCard.clientId,
        cashSessionId: input.cashSessionId,
        total: input.amount,
        paymentMethod: "GIFTCARD",
        items: {
          create: [
            {
              description: `Canje giftcard ${giftCard.code}`,
              quantity: 1,
              unitPrice: input.amount,
            },
          ],
        },
      },
    });

    await tx.giftCardTransaction.create({
      data: {
        giftCardId: giftCard.id,
        type: "REDEEM",
        amount: input.amount,
        saleId: sale.id,
      },
    });

    return sale;
  });
}
