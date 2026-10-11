import { prisma } from "@/lib/prisma";

// SignupAttempt, PublicBookingAttempt, LoginAttempt y PasswordResetAttempt
// solo se leen dentro de ventanas cortas (ver checkSignupRateLimit /
// checkPublicBookingRateLimit / checkLoginRateLimit /
// checkPasswordResetRateLimit), pero nunca se borran — sin esto crecen para
// siempre. Se llama una vez al día desde el cron existente
// (api/cron/daily-bookings), con un margen amplio sobre la ventana real
// para no arriesgar un rate limit en curso.
const RETENTION_DAYS = 2;

export async function cleanupOldRateLimitAttempts() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60_000);

  const [signupAttempts, publicBookingAttempts, loginAttempts, passwordResetAttempts, passwordResetTokens] =
    await Promise.all([
      prisma.signupAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      prisma.publicBookingAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      prisma.passwordResetAttempt.deleteMany({ where: { createdAt: { lt: cutoff } } }),
      // Los tokens de reset solo viven 1 hora (ver PASSWORD_RESET_TOKEN_TTL_MINUTES
      // en auth.ts) — una vez vencidos (usados o no) no sirven para nada,
      // pero nada los borraba.
      prisma.passwordResetToken.deleteMany({ where: { expiresAt: { lt: cutoff } } }),
    ]);

  return {
    signupAttemptsDeleted: signupAttempts.count,
    publicBookingAttemptsDeleted: publicBookingAttempts.count,
    loginAttemptsDeleted: loginAttempts.count,
    passwordResetAttemptsDeleted: passwordResetAttempts.count,
    passwordResetTokensDeleted: passwordResetTokens.count,
  };
}
