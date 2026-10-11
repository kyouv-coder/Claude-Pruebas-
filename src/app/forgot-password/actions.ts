"use server";

import {
  requestPasswordReset,
  checkPasswordResetRateLimit,
  recordPasswordResetAttempt,
} from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { getClientIp } from "@/lib/request";
import { getSiteUrl } from "@/lib/site-url";
import { logUnexpectedError } from "@/lib/log";

export type ActionState = { error?: string; success?: string };

// Mensaje genérico siempre igual, exista o no una cuenta con ese email —
// si cambiara según el caso, este formulario sirve para enumerar qué
// emails tienen cuenta en el sistema.
const GENERIC_SUCCESS: ActionState = {
  success: "Si existe una cuenta con ese email, te mandamos un link para restablecer la contraseña.",
};

export async function forgotPasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ip = await getClientIp();
  const withinLimit = await checkPasswordResetRateLimit(ip);
  if (!withinLimit) {
    return { error: "Demasiados intentos. Probá de nuevo en un rato." };
  }
  await recordPasswordResetAttempt(ip);

  const email = String(formData.get("email") || "").trim();
  if (!email) {
    return { error: "Ingresá tu email." };
  }

  try {
    const result = await requestPasswordReset(email);
    if (result) {
      const resetUrl = `${getSiteUrl()}/reset-password?token=${result.token}`;
      await sendPasswordResetEmail(email, resetUrl);
    }
  } catch (e) {
    // Nunca se revela acá si falló: mismo motivo que no revelar si el
    // email existe. Pero si el envío de verdad falla, igual queremos
    // verlo en los logs/Sentry en vez de perderlo en silencio.
    logUnexpectedError(e);
  }

  return GENERIC_SUCCESS;
}
