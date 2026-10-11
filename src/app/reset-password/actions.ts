"use server";

import { redirect } from "next/navigation";
import { resetPasswordWithToken } from "@/lib/auth";
import { logUnexpectedError } from "@/lib/log";

export type ActionState = { error?: string };

export async function resetPasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const token = String(formData.get("token") || "");
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!token) {
    return { error: "Link inválido. Pedí uno nuevo." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  // Mismo tope que signup/alta de staff/cambio de contraseña: bcrypt
  // trunca en silencio todo lo que pase de 72 bytes.
  if (Buffer.byteLength(password, "utf8") > 72) {
    return { error: "La contraseña no puede tener más de 72 bytes (los acentos y emojis cuentan más de uno)." };
  }
  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  try {
    const result = await resetPasswordWithToken(token, password);
    if (result.error) {
      return { error: result.error };
    }
  } catch (e) {
    logUnexpectedError(e);
    return { error: "No se pudo restablecer la contraseña. Probá de nuevo." };
  }

  redirect("/login");
}
