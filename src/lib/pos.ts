import { prisma } from "@/lib/prisma";
import type { PaymentMethod } from "@/generated/prisma";

async function getOperator() {
  const admin = await prisma.user.findFirstOrThrow({
    where: { role: "ADMIN", active: true },
  });
  return admin;
}

export async function getOpenCashSession() {
  return prisma.cashRegisterSession.findFirst({
    where: { closedAt: null },
    orderBy: { openedAt: "desc" },
  });
}

export async function openCashSession(openingAmount: number) {
  const operator = await getOperator();
  return prisma.cashRegisterSession.create({
    data: { openedById: operator.id, openingAmount },
  });
}

export async function closeCashSession(sessionId: string, closingAmount: number) {
  return prisma.cashRegisterSession.update({
    where: { id: sessionId },
    data: { closedAt: new Date(), closingAmount },
  });
}

export async function getCashSessionSummary(sessionId: string) {
  const sales = await prisma.sale.findMany({
    where: { cashSessionId: sessionId },
    select: { total: true, paymentMethod: true },
  });
  const total = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const byMethod = sales.reduce<Record<string, number>>((acc, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] ?? 0) + Number(s.total);
    return acc;
  }, {});
  return { salesCount: sales.length, total, byMethod };
}

export async function getTodaysUnpaidBookings() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return prisma.booking.findMany({
    where: {
      startTime: { gte: start, lt: end },
      status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
      sale: null,
    },
    orderBy: { startTime: "asc" },
    include: { client: true, service: true, staff: true },
  });
}

export async function chargeBooking(
  bookingId: string,
  cashSessionId: string,
  paymentMethod: PaymentMethod
) {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { service: true },
  });

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
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

function generateGiftCardCode() {
  return `GC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function sellGiftCard(input: {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  cashSessionId: string;
}) {
  const client = await prisma.client.create({
    data: {
      name: input.clientName,
      phone: input.clientPhone || null,
      email: input.clientEmail || null,
    },
  });

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
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

export async function redeemGiftCard(input: {
  code: string;
  amount: number;
  cashSessionId: string;
}) {
  const giftCard = await prisma.giftCard.findUniqueOrThrow({
    where: { code: input.code },
  });

  if (!giftCard.active) throw new Error("La giftcard no está activa");
  if (Number(giftCard.balance) < input.amount) {
    throw new Error("Saldo insuficiente en la giftcard");
  }

  return prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
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
