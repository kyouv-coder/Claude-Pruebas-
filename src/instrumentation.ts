import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Sin SENTRY_DSN, Sentry.init() nunca se llamó con un cliente activo,
// así que esto queda como no-op — seguro de dejar siempre exportado.
export const onRequestError = Sentry.captureRequestError;
