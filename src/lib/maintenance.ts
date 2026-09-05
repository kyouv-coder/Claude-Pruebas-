import { prisma } from "@/lib/prisma";

// SignupAttempt y PublicBookingAttempt solo se leen dentro de ventanas de
// 60 minutos (ver checkSignupRateLimit / checkPublicBookingRateLimit), pero
// nunca se borran — sin esto crecen para siempre. Se llama una vez al día
// desde el cron existente (api/cron/daily-bookings), con un margen amplio
// sobre la ventana real para no arriesgar un rate limit en curso.
const RETENTION_DAYS = 2;

export async function cleanupOldRateLimitAttempts() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60_000);

  const [signupAttempts, publicBookingAttempts] = await Promise.all([
    prisma.signupAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.publicBookingAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);

  return {
    signupAttemptsDeleted: signupAttempts.count,
    publicBookingAttemptsDeleted: publicBookingAttempts.count,
  };
}
