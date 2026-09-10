import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Prisma, type BusinessType } from "@/generated/prisma";
import { generateUniqueSlug } from "@/lib/slug";
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

const LOGIN_WINDOW_MINUTES = 15;
const LOGIN_MAX_ATTEMPTS = 20;

// El bloqueo por cuenta (MAX_FAILED_ATTEMPTS más abajo) frena a alguien
// probando muchas contraseñas contra un email — pero no a alguien probando
// una contraseña contra muchos emails distintos desde la misma IP
// (credential stuffing). El límite es más permisivo que el de signup
// porque un usuario real tipeando mal su contraseña un par de veces es
// mucho más común que registrando negocios repetidamente.
export async function checkLoginRateLimit(ip: string) {
  const windowStart = new Date(Date.now() - LOGIN_WINDOW_MINUTES * 60_000);
  const recentAttempts = await prisma.loginAttempt.count({
    where: { ip, createdAt: { gte: windowStart } },
  });
  return recentAttempts < LOGIN_MAX_ATTEMPTS;
}

export async function recordLoginAttempt(ip: string) {
  await prisma.loginAttempt.create({ data: { ip } });
}

export async function signUp(input: {
  businessName: string;
  businessType: BusinessType;
  name: string;
  email: string;
  password: string;
}) {
  const passwordHash = await hashPassword(input.password);

  // generateUniqueSlug chequea que el slug no exista y recién después se
  // usa acá para crear el negocio — no es atómico. Dos registros con
  // nombres de negocio parecidos casi al mismo tiempo (ej. dos "Spa Luna")
  // pueden generar el mismo candidato y solo uno gana la carrera; el otro
  // reintenta con un slug nuevo en vez de fallar con un P2002 que el
  // caller interpretaría erróneamente como "email repetido".
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const slug = await generateUniqueSlug(input.businessName);
    try {
      return await prisma.$transaction(async (tx) => {
        const business = await tx.business.create({
          data: { name: input.businessName, businessType: input.businessType, slug },
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
    } catch (e) {
      const target = (e as { meta?: { target?: unknown } })?.meta?.target;
      const isSlugConflict =
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === "P2002" &&
        Array.isArray(target) &&
        target.includes("slug");
      if (!isSlugConflict || attempt === MAX_ATTEMPTS) throw e;
    }
  }
  throw new Error("No se pudo crear la cuenta, intentá de nuevo.");
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

  // Mismo bloqueo que usa el login: sin esto, alguien con la sesión
  // robada (cookie filtrada, dispositivo desatendido) podía probar la
  // contraseña actual sin límite acá, algo que el propio login sí frena
  // después de 5 intentos.
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: "Cuenta bloqueada temporalmente por demasiados intentos. Probá de nuevo más tarde." };
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    await prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: attempts,
        lockedUntil:
          attempts >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
            : null,
      },
    });
    return { error: "La contraseña actual no es correcta." };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
  });
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
    include: { business: { omit: { coverImageData: true } } },
  });
}
