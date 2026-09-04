import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

// Sin SENTRY_DSN configurado, el SDK no envía nada — queda listo para
// activarse con solo cargar la variable de entorno, sin volver a tocar
// código.
export default withSentryConfig(nextConfig, {
  silent: true,
});
