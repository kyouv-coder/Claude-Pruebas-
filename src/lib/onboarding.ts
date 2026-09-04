import { prisma } from "@/lib/prisma";
import { hasConfiguredHours } from "@/lib/business-hours";

export type OnboardingStatus = {
  hasServices: boolean;
  hasStaff: boolean;
  hasSlackWebhook: boolean;
  hasBusinessHours: boolean;
  isComplete: boolean;
};

export async function getOnboardingStatus(businessId: string): Promise<OnboardingStatus> {
  const [serviceCount, staffCount, business, hasBusinessHours] = await Promise.all([
    prisma.service.count({ where: { businessId, active: true } }),
    prisma.user.count({ where: { businessId, role: "STAFF", active: true } }),
    prisma.business.findUnique({ where: { id: businessId }, select: { slackWebhookUrl: true } }),
    hasConfiguredHours(businessId),
  ]);

  const hasServices = serviceCount > 0;
  const hasStaff = staffCount > 0;
  const hasSlackWebhook = Boolean(business?.slackWebhookUrl);

  return {
    hasServices,
    hasStaff,
    hasSlackWebhook,
    hasBusinessHours,
    isComplete: hasServices && hasStaff,
  };
}
