"use server";

import { redirect } from "next/navigation";
import { verifyCredentials, createSession } from "@/lib/auth";

export type ActionState = { error?: string };

export async function loginAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
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
}
