"use server";

import { getCurrentUser, changePassword } from "@/lib/auth";

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
  // bcrypt trunca en silencio todo lo que pase de 72 bytes: una contraseña
  // más larga que eso da una falsa sensación de seguridad, porque el resto
  // nunca se compara ni afecta el hash.
  if (newPassword.length > 72) {
    return { error: "La nueva contraseña no puede tener más de 72 caracteres." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "La confirmación no coincide con la nueva contraseña." };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { error: "No hay una sesión activa." };
  }

  const result = await changePassword(user.id, currentPassword, newPassword);
  if (result.error) {
    return { error: result.error };
  }

  return { success: "Contraseña actualizada." };
}
