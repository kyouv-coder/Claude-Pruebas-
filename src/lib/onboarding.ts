import { prisma } from "@/lib/prisma";

export type OnboardingStatus = {
  hasServices: boolean;
  hasStaff: boolean;
  hasSlackWebhook: boolean;
  isComplete: boolean;
};

export async function getOnboardingStatus(businessId: string): Promise<OnboardingStatus> {
  const [serviceCount, staffCount, business] = await Promise.all([
    prisma.service.count({ where: { businessId, active: true } }),
    prisma.user.count({ where: { businessId, role: "STAFF", active: true } }),
    prisma.business.findUnique({ where: { id: businessId }, select: { slackWebhookUrl: true } }),
  ]);

  const hasServices = serviceCount > 0;
  const hasStaff = staffCount > 0;
  const hasSlackWebhook = Boolean(business?.slackWebhookUrl);

  return {
    hasServices,
    hasStaff,
    hasSlackWebhook,
    isComplete: hasServices && hasStaff,
  };
}
