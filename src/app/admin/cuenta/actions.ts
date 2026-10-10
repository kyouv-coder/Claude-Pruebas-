"use server";

import { getCurrentUser, changePassword } from "@/lib/auth";
import { logUnexpectedError } from "@/lib/log";

export type ActionState = { error?: string; success?: string };

export async function changePasswordAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const currentPassword = String(formData.get("currentPassword") || "");
  const newPassword = String(formData.get("newPassword") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Completá los tres campos." };
  }
  if (newPassword.length < 8) {
    return { error: "La nueva contraseña debe tener al menos 8 caracteres." };
  }
  // bcrypt trunca en silencio todo lo que pase de 72 BYTES al hashear: una
  // contraseña más larga que eso da una falsa sensación de seguridad, porque
  // el resto nunca se compara ni afecta el hash. Se mide en bytes (no
  // `.length`, que cuenta unidades UTF-16): una contraseña con tildes o
  // emojis puede tener 72 caracteres o menos y ya superar los 72 bytes.
  if (Buffer.byteLength(newPassword, "utf8") > 72) {
    return { error: "La nueva contraseña no puede tener más de 72 bytes (los acentos y emojis cuentan más de uno)." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "La confirmación no coincide con la nueva contraseña." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: "No hay una sesión activa." };
  }

  // Sin este try/catch, cualquier error inesperado de changePassword (ej. el
  // findUniqueOrThrow si la sesión quedó apuntando a un usuario ya borrado, o
  // un problema transitorio de conexión con la base) tumbaba toda la página
  // de "Mi cuenta" con el error genérico de Next — el mismo anti-patrón ya
  // corregido antes en chargeBookingAction, createExpenseAction, etc.
  let result;
  try {
    result = await changePassword(user.id, currentPassword, newPassword);
  } catch (e) {
    logUnexpectedError(e);
    return {
      error: e instanceof Error ? e.message : "No se pudo actualizar la contraseña.",
    };
  }
  if (result.error) {
    return { error: result.error };
  }

  return { success: "Contraseña actualizada." };
}
