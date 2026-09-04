"use server";

import { redirect } from "next/navigation";
import { Prisma } from "@/generated/prisma";
import { signUp, createSession } from "@/lib/auth";

export type ActionState = { error?: string };

export async function signupAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const businessName = String(formData.get("businessName") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!businessName) {
    return { error: "Ingresá el nombre de tu negocio." };
  }
  if (!name) {
    return { error: "Ingresá tu nombre." };
  }
  if (!email || !email.includes("@")) {
    return { error: "Ingresá un email válido." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  let userId: string;
  try {
    const result = await signUp({ businessName, name, email, password });
    userId = result.user.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ya existe una cuenta con ese email." };
    }
    return { error: "No se pudo crear la cuenta. Probá de nuevo." };
  }

  await createSession(userId);
  redirect("/admin/reservas");
}
