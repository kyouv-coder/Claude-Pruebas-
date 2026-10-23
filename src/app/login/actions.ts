"use server";

import { redirect, unstable_rethrow } from "next/navigation";
import {
  verifyCredentials,
  createSession,
  checkLoginRateLimit,
  recordLoginAttempt,
} from "@/lib/auth";
import { getClientIp } from "@/lib/request";
import { logUnexpectedError } from "@/lib/log";

export type ActionState = { error?: string };

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const ip = await getClientIp();
    const withinLimit = await checkLoginRateLimit(ip);
    if (!withinLimit) {
      return { error: "Demasiados intentos. Probá de nuevo en un rato." };
    }
    await recordLoginAttempt(ip);

    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const next = String(formData.get("next") || "/admin/reservas");

    if (!email || !password) {
      return { error: "Ingresá tu email y contraseña." };
    }

    const user = await verifyCredentials(email, password);
    if (!user) {
      return { error: "Email o contraseña incorrectos." };
    }

    await createSession(user.id);
    redirect(next.startsWith("/admin") ? next : "/admin/reservas");
  } catch (e) {
    unstable_rethrow(e);
    logUnexpectedError(e);
    return { error: "Ocurrió un error inesperado. Probá de nuevo en un momento." };
  }
}
