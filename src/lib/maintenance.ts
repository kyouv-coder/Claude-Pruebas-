import { prisma } from "@/lib/prisma";

// SignupAttempt, PublicBookingAttempt y LoginAttempt solo se leen dentro de
// ventanas cortas (ver checkSignupRateLimit / checkPublicBookingRateLimit /
// checkLoginRateLimit), pero nunca se borran — sin esto crecen para
// siempre. Se llama una vez al día desde el cron existente
// (api/cron/daily-bookings), con un margen amplio sobre la ventana real
// para no arriesgar un rate limit en curso.
const RETENTION_DAYS = 2;

export async function cleanupOldRateLimitAttempts() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60_000);

  const [signupAttempts, publicBookingAttempts, loginAttempts] = await Promise.all([
    prisma.signupAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.publicBookingAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);

  return {
    signupAttemptsDeleted: signupAttempts.count,
    publicBookingAttemptsDeleted: publicBookingAttempts.count,
    loginAttemptsDeleted: loginAttempts.count,
  };
}
