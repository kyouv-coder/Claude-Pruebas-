import { prisma } from "@/lib/prisma";

export const GIFT_CARDS_PAGE_SIZE = 25;

export async function listGiftCards(
  businessId: string,
  { skip = 0, take }: { skip?: number; take?: number } = {}
) {
  return prisma.giftCard.findMany({
    where: { businessId },
    include: { purchasedBy: true },
    orderBy: { createdAt: "desc" },
    skip,
    ...(take !== undefined ? { take } : {}),
  });
}

export async function countGiftCards(businessId: string) {
  return prisma.giftCard.count({ where: { businessId } });
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
