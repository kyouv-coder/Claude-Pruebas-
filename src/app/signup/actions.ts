"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma";
import { signUp, createSession, checkSignupRateLimit, recordSignupAttempt } from "@/lib/auth";

export type ActionState = { error?: string };

async function getClientIp() {
  const headerList = await headers();
  // x-real-ip lo pone la plataforma de deploy (Vercel) directamente, sin
  // que el cliente pueda sobreescribirlo — se prioriza sobre
  // x-forwarded-for, que un cliente puede mandar con un valor propio si
  // el proxy no lo sanitiza antes de reenviarlo a la app.
  const realIp = headerList.get("x-real-ip");
  if (realIp) return realIp.trim();

  const forwardedFor = headerList.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

export async function signupAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const ip = await getClientIp();
  const withinLimit = await checkSignupRateLimit(ip);
  if (!withinLimit) {
    return { error: "Demasiados intentos de registro. Probá de nuevo en un rato." };
  }
  await recordSignupAttempt(ip);

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
