import * as Sentry from "@sentry/nextjs";

/**
 * Registra un error inesperado atrapado en una server action, antes de
 * devolver un mensaje genérico a la pantalla.
 *
 * Sin esto, las ~25 acciones que envuelven su lógica en try/catch (para no
 * tumbar la página entera ante un error no previsto) lo tragaban en
 * silencio: ni aparecía en los logs de Vercel ni llegaba a Sentry, aunque el
 * SDK ya está instalado (`src/instrumentation.ts`) — porque Sentry solo
 * captura automáticamente lo que explota sin atrapar, y estas acciones ya lo
 * atrapan antes de que llegue ahí. `Sentry.captureException` no hace nada si
 * `SENTRY_DSN` no está configurado (ver README), así que esto no cambia el
 * comportamiento hoy, solo deja de perder la traza cuando se active.
 */
export function logUnexpectedError(e: unknown): void {
  console.error(e);
  Sentry.captureException(e);
}

/**
 * Devuelve un mensaje seguro para mostrarle al usuario a partir de un error
 * atrapado en una server action.
 *
 * Las funciones de negocio (src/lib/pos.ts, availability, etc.) tiran
 * `new Error("mensaje en castellano para el usuario")` a propósito para los
 * casos esperados ("Esta caja ya fue cerrada.", "Saldo insuficiente en la
 * giftcard") — esos son seguros de mostrar tal cual. Pero un error que no
 * previmos (falla de conexión, violación de constraint, columna que no
 * existe) puede traer en `message` detalles internos de Postgres/Prisma
 * (nombres de tabla, de columna, fragmentos de la query) que no deberían
 * llegar a la pantalla de un usuario final. Por eso cualquier error de
 * Prisma cae siempre al mensaje genérico, nunca se expone `e.message`.
 *
 * Se detecta por duck typing (en vez de `instanceof Prisma.PrismaClient...`)
 * a propósito: este helper también lo usa `src/app/error.tsx`, un client
 * component, y el paquete de Prisma generado (`@/generated/prisma`) usa
 * `node:fs`/`node:fs/promises` — importarlo ahí rompe el build de webpack
 * ("UnhandledSchemeError") porque intentaría meter el runtime de Prisma en
 * el bundle del navegador. Todos los errores de Prisma (known/unknown
 * request, validation, initialization, rust panic) exponen `clientVersion`.
 */
export function getSafeErrorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "clientVersion" in e) {
    return fallback;
  }
  return e instanceof Error ? e.message : fallback;
}
