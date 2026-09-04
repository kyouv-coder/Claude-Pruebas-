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
  return prisma.cashRegisterSession.create({
    data: { businessId, openedById: operator.id, openingAmount },
  });
}

export async function closeCashSession(
  businessId: string,
  sessionId: string,
  closingAmount: number
) {
  return prisma.cashRegisterSession.update({
    where: { id: sessionId, businessId },
    data: { closedAt: new Date(), closingAmount },
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

    if (product.stock < input.quantity) {
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

    await tx.product.update({
      where: { id: product.id },
      data: { stock: product.stock - input.quantity },
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
  }
) {
  const client = await prisma.client.create({
    data: {
      businessId,
      name: input.clientName,
      phone: input.clientPhone || null,
      email: input.clientEmail || null,
    },
  });

  return prisma.$transaction(async (tx) => {
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
  if (Number(giftCard.balance) < input.amount) {
    throw new Error("Saldo insuficiente en la giftcard");
  }

  return prisma.$transaction(async (tx) => {
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

    const newBalance = Number(giftCard.balance) - input.amount;
    await tx.giftCard.update({
      where: { id: giftCard.id },
      data: { balance: newBalance, active: newBalance > 0 ? true : false },
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
