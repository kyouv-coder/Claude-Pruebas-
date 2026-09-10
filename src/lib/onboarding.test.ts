import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import { getOnboardingStatus } from "./onboarding";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("getOnboardingStatus", () => {
  let businessId: string;

  beforeAll(async () => {
    const business = await prisma.business.create({
      data: { name: "Test Onboarding Business", businessType: "SPA", slug: `test-onboarding-${Date.now()}` },
    });
    businessId = business.id;
  });

  afterAll(async () => {
    await prisma.service.deleteMany({ where: { businessId } });
    await prisma.user.deleteMany({ where: { businessId } });
    await prisma.business.delete({ where: { id: businessId } });
    await prisma.$disconnect();
  });

  it("is not complete for a brand-new business with no services or staff", async () => {
    const status = await getOnboardingStatus(businessId);
    expect(status).toMatchObject({
      hasServices: false,
      hasStaff: false,
      hasSlackWebhook: false,
      isComplete: false,
    });
  });

  it("ignores inactive services/staff when checking completeness", async () => {
    await prisma.service.create({
      data: { businessId, name: "Servicio Inactivo", durationMinutes: 30, price: 1000, active: false },
    });
    await prisma.user.create({
      data: {
        businessId,
        name: "Staff Inactivo",
        email: `staff-inactivo-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "STAFF",
        active: false,
      },
    });

    const status = await getOnboardingStatus(businessId);
    expect(status.hasServices).toBe(false);
    expect(status.hasStaff).toBe(false);
    expect(status.isComplete).toBe(false);
  });

  it("is complete once there's at least one active service and one active staff member", async () => {
    await prisma.service.create({
      data: { businessId, name: "Servicio Activo", durationMinutes: 30, price: 1000, active: true },
    });
    await prisma.user.create({
      data: {
        businessId,
        name: "Staff Activo",
        email: `staff-activo-${Date.now()}@example.com`,
        passwordHash: "unused",
        role: "STAFF",
        active: true,
      },
    });

    const status = await getOnboardingStatus(businessId);
    expect(status.hasServices).toBe(true);
    expect(status.hasStaff).toBe(true);
    expect(status.isComplete).toBe(true);
  });

  it("reflects the Slack webhook and business hours flags independently of completeness", async () => {
    await prisma.business.update({
      where: { id: businessId },
      data: { slackWebhookUrl: "https://hooks.slack.com/services/test" },
    });

    const status = await getOnboardingStatus(businessId);
    expect(status.hasSlackWebhook).toBe(true);
    // isComplete solo depende de servicios+staff, no de Slack ni horarios.
    expect(status.isComplete).toBe(true);
  });
});
