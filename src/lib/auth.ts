import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { Prisma, type BusinessType } from "@/generated/prisma";
import { generateUniqueSlug } from "@/lib/slug";
import { SESSION_COOKIE, createSessionToken, verifySessionToken } from "@/lib/session";
import { assertMaxLength, assertMinPasswordLength, assertPasswordByteLength } from "@/lib/validation";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 días

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// A hash of an unguessable value, used only so "user not found" takes the
// same time as "user found, wrong password" — otherwise response timing
// leaks which emails have an account.
const DUMMY_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8vJ5EexZO/Nkl6P6dLPwUv3rHKvYh6";

export async function hashPassword(password: string) {
  assertMinPasswordLength(password);
  assertPasswordByteLength(password);
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

const PASSWORD_RESET_WINDOW_MINUTES = 60;
const PASSWORD_RESET_MAX_ATTEMPTS = 5;

// Mismo motivo que checkSignupRateLimit/checkLoginRateLimit: sin esto,
// alguien podía mandar el formulario de "olvidé mi contraseña" sin límite
// para una misma IP, ya sea para enumerar emails con cuenta o para saturar
// de emails una bandeja ajena.
export async function checkPasswordResetRateLimit(ip: string) {
  const windowStart = new Date(Date.now() - PASSWORD_RESET_WINDOW_MINUTES * 60_000);
  const recentAttempts = await prisma.passwordResetAttempt.count({
    where: { ip, createdAt: { gte: windowStart } },
  });
  return recentAttempts < PASSWORD_RESET_MAX_ATTEMPTS;
}

export async function recordPasswordResetAttempt(ip: string) {
  await prisma.passwordResetAttempt.create({ data: { ip } });
}

const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;

// El token que se manda por email es el valor crudo (lo necesita el link);
// solo su hash SHA-256 se guarda en la base — mismo motivo que passwordHash
// con bcrypt: si alguien llegara a leer la tabla (backup filtrado, acceso
// de lectura a la base), no podría usarla para resetear la contraseña de
// nadie, porque no puede reconstruir el token crudo a partir del hash.
function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

// No revela si el email existe ni si el envío falló — el caller (la
// action) siempre debería mostrar el mismo mensaje genérico, para no dejar
// que alguien use este formulario para enumerar qué emails tienen cuenta
// (mismo motivo que DUMMY_HASH en verifyCredentials, pero a nivel de
// action en vez de timing).
export async function requestPasswordReset(email: string): Promise<{ token: string; userId: string } | null> {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), active: true },
  });
  if (!user) return null;

  const token = randomBytes(32).toString("hex");
  // Pedir el link varias veces (reintento tras no recibir el email, varias
  // pestañas, o alguien más mandándolo a propósito) dejaba todos los tokens
  // anteriores todavía válidos hasta su propio vencimiento — cualquier link
  // viejo que haya quedado en una bandeja de entrada o en el historial del
  // navegador seguía pudiendo usarse en paralelo al más nuevo. Invalidar los
  // anteriores no vencidos y sin usar reduce esa ventana a un solo link
  // vigente por usuario, igual que hace un "cerrar otras sesiones".
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashResetToken(token),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000),
    },
  });
  return { token, userId: user.id };
}

// Un solo uso: se marca `usedAt` dentro de la misma transacción que
// cambia la contraseña, así un link reenviado o abierto dos veces (doble
// clic, dos pestañas) no puede resetear la contraseña dos veces ni
// quedarse disponible para quien lo haya interceptado después de usarlo.
export async function resetPasswordWithToken(token: string, newPassword: string) {
  const tokenHash = hashResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { error: "Este link para restablecer la contraseña venció o ya fue usado. Pedí uno nuevo." };
  }

  const passwordHash = await hashPassword(newPassword);
  // El findUnique de arriba no alcanza para garantizar un solo uso: dos
  // requests concurrentes (doble clic, el link abierto en dos pestañas)
  // podrían pasar ambas el chequeo de `usedAt` antes de que cualquiera
  // llegue a esta transacción. Por eso el marcado de uso va condicionado
  // (updateMany con `usedAt: null` en el where, mismo patrón que el
  // decremento de stock/saldo en pos.ts) y, si otra request ya lo marcó
  // primero, esta aborta sin tocar la contraseña del usuario.
  try {
    await prisma.$transaction(async (tx) => {
      const marked = await tx.passwordResetToken.updateMany({
        where: { id: resetToken.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (marked.count === 0) {
        throw new Error("PASSWORD_RESET_TOKEN_ALREADY_USED");
      }
      await tx.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "PASSWORD_RESET_TOKEN_ALREADY_USED") {
      return { error: "Este link para restablecer la contraseña venció o ya fue usado. Pedí uno nuevo." };
    }
    throw e;
  }
  return { error: null };
}

export async function signUp(input: {
  businessName: string;
  businessType: BusinessType;
  name: string;
  email: string;
  password: string;
}) {
  // signupAction ya valida estos topes en el formulario, pero el mismo
  // patrón usado en createBooking/sellGiftCard/createClient (etc.) es que
  // la función de dominio no dependa de que el único caller la valide
  // bien — sin esto, un valor gigante llegado por otro camino (o un
  // cambio futuro en la action que se olvide del límite) se guardaba tal
  // cual en el negocio y el usuario.
  assertMaxLength(input.businessName, 150, "El nombre del negocio");
  assertMaxLength(input.name, 150, "El nombre");
  assertMaxLength(input.email, 255, "El email");

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
            // Mismo motivo que createStaff (settings.ts): email es @unique
            // y el login compara case-sensitive, así que sin normalizar acá
            // alguien podría registrarse con "Maria@Spa.com" y no poder
            // volver a entrar tipeando su email en minúscula.
            email: input.email.toLowerCase(),
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
  // Todo email se guarda en minúscula (signUp, createStaff/updateStaff) —
  // normalizar acá también es lo que hace que ese cambio realmente sirva
  // para loguearse, sea cual sea la mayúscula/minúscula con la que alguien
  // tipee su email.
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), active: true },
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

// Sin sesión, cada página de /admin llama a esto directo (no hay
// middleware central) — tirar un throw acá tumbaba la página con el error
// genérico de Next en vez de mandar a loguearse, tanto para una visita
// directa sin sesión como para una sesión ya vencida (cookie de hasta 7
// días) al navegar o al enviar un formulario.
export async function requireBusinessId() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user.businessId;
}

// Páginas/acciones sensibles (finanzas, configuración, métricas de
// negocio) están reservadas al rol ADMIN — el staff puede operar
// (reservas, caja) pero no ver ganancia neta ni editar precios.
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    redirect("/admin/reservas");
  }
  return user.businessId;
}

// cache() (React, no relación con HTTP cache) memoiza por request de
// render: el layout de /admin ya llama a esto, y casi todas las páginas
// hijas vuelven a llamarlo vía requireBusinessId/requireAdmin — sin esto,
// cada página hacía un segundo (o tercer) findFirst con join a business
// idéntico al del layout, en la misma request, para el mismo resultado.
export const getCurrentUser = cache(async function getCurrentUser() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await verifySessionToken(token, secret);
  if (!session) return null;

  // active: true acá, no solo en verifyCredentials — sin esto, desactivar
  // a alguien del staff (toggleStaffActiveAction) no cortaba nada: su
  // sesión ya emitida (JWT, válido hasta 7 días) seguía funcionando en
  // toda la app, solo bloqueaba intentos de login nuevos.
  return prisma.user.findFirst({
    where: { id: session.sub, active: true },
    include: { business: { omit: { coverImageData: true } } },
  });
});
