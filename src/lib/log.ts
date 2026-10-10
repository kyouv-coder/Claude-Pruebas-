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
