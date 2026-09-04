import { prisma } from "@/lib/prisma";

export async function listGiftCards(businessId: string) {
  return prisma.giftCard.findMany({
    where: { businessId },
    include: { purchasedBy: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getGiftCardStats(businessId: string) {
  const giftCards = await prisma.giftCard.findMany({
    where: { businessId },
    select: { active: true, balance: true, expiresAt: true },
  });

  const now = new Date();
  const active = giftCards.filter(
    (g) => g.active && Number(g.balance) > 0 && (!g.expiresAt || g.expiresAt > now)
  );
  const outstandingBalance = active.reduce((sum, g) => sum + Number(g.balance), 0);

  return {
    total: giftCards.length,
    activeCount: active.length,
    outstandingBalance,
  };
}
