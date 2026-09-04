import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { BusinessType } from "@/generated/prisma";
import { SESSION_COOKIE, createSessionToken, verifySessionToken } from "@/lib/session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// A hash of an unguessable value, used only so "user not found" takes the
// same time as "user found, wrong password" — otherwise response timing
// leaks which emails have an account.
const DUMMY_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8vJ5EexZO/Nkl6P6dLPwUv3rHKvYh6";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

const SIGNUP_WINDOW_MINUTES = 60;
const SIGNUP_MAX_ATTEMPTS = 5;

// Registrado en DB (no en memoria) porque cada invocación serverless
// puede correr en una instancia distinta — un contador en memoria no
// se compartiría entre requests.
export async function checkSignupRateLimit(ip: string) {
  const windowStart = new Date(Date.now() - SIGNUP_WINDOW_MINUTES * 60_000);
  const recentAttempts = await prisma.signupAttempt.count({
    where: { ip, createdAt: { gte: windowStart } },
  });
  return recentAttempts < SIGNUP_MAX_ATTEMPTS;
}

export async function recordSignupAttempt(ip: string) {
  await prisma.signupAttempt.create({ data: { ip } });
}

export async function signUp(input: {
  businessName: string;
  businessType: BusinessType;
  name: string;
  email: string;
  password: string;
}) {
  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: { name: input.businessName, businessType: input.businessType },
    });
    const user = await tx.user.create({
      data: {
        businessId: business.id,
        name: input.name,
        email: input.email,
        passwordHash,
        role: "ADMIN",
      },
    });
    return { business, user };
  });
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { email, active: true },
  });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    // Still run a comparison so a locked account doesn't respond faster
    // than a normal failed attempt and leak lockout state via timing.
    await bcrypt.compare(password, DUMMY_HASH);
    return null;
  }

  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid) {
    if (user) {
      const attempts = user.failedLoginAttempts + 1;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil:
            attempts >= MAX_FAILED_ATTEMPTS
              ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
              : null,
        },
      });
    }
    return null;
  }

  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  return user;
}

export async function createSession(userId: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET no está configurado en el servidor.");
  }
  const token = await createSessionToken(userId, secret, SESSION_MAX_AGE_SECONDS);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { error: "La contraseña actual no es correcta." };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { error: null };
}

export async function requireBusinessId() {
  const user = await getCurrentUser();
  if (!user) throw new Error("No hay una sesión activa.");
  return user.businessId;
}

// Páginas/acciones sensibles (finanzas, configuración, métricas de
// negocio) están reservadas al rol ADMIN — el staff puede operar
// (reservas, caja) pero no ver ganancia neta ni editar precios.
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("No hay una sesión activa.");
  if (user.role !== "ADMIN") {
    redirect("/admin/reservas");
  }
  return user.businessId;
}

export async function getCurrentUser() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token, secret);
  if (!session) return null;

  return prisma.user.findUnique({
    where: { id: session.sub },
    include: { business: true },
  });
}
