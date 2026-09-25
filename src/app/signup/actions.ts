"use server";

import { redirect } from "next/navigation";
import { Prisma, type BusinessType } from "@/generated/prisma";
import { signUp, createSession, checkSignupRateLimit, recordSignupAttempt } from "@/lib/auth";
import { BUSINESS_TYPE_OPTIONS } from "@/lib/verticals";
import { getClientIp } from "@/lib/request";

export type ActionState = { error?: string };

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
  const businessType = String(formData.get("businessType") || "") as BusinessType;
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!businessName) {
    return { error: "Ingresá el nombre de tu negocio." };
  }
  // Ningún campo de nombre tenía tope — a diferencia de la descripción, la
  // dirección o las notas, que ya lo tienen — a pesar de mostrarse en la
  // página pública de reserva y en el resto del panel.
  if (businessName.length > 150) {
    return { error: "El nombre del negocio es demasiado largo (máximo 150 caracteres)." };
  }
  if (!BUSINESS_TYPE_OPTIONS.some((o) => o.value === businessType)) {
    return { error: "Elegí el rubro de tu negocio." };
  }
  if (!name) {
    return { error: "Ingresá tu nombre." };
  }
  if (name.length > 150) {
    return { error: "Tu nombre es demasiado largo (máximo 150 caracteres)." };
  }
  if (!email || !email.includes("@")) {
    return { error: "Ingresá un email válido." };
  }
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }
  // bcrypt trunca en silencio todo lo que pase de 72 bytes: una contraseña
  // más larga que eso da una falsa sensación de seguridad, porque el resto
  // nunca se compara ni afecta el hash.
  if (password.length > 72) {
    return { error: "La contraseña no puede tener más de 72 caracteres." };
  }

  let userId: string;
  try {
    const result = await signUp({ businessName, businessType, name, email, password });
    userId = result.user.id;
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = e.meta?.target;
      if (Array.isArray(target) && target.includes("email")) {
        return { error: "Ya existe una cuenta con ese email." };
      }
    }
    return { error: "No se pudo crear la cuenta. Probá de nuevo." };
  }

  await createSession(userId);
  redirect("/admin/reservas");
}
