import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // Sin esto, todo el sitio (incluido el panel de admin ya logueado) es
  // embebible en un <iframe> de cualquier otro dominio — habilita
  // clickjacking (un sitio malicioso superpone su propia UI sobre un iframe
  // invisible de /admin/caja o /admin/reservas para que un clic real del
  // usuario dispare una acción sin que se dé cuenta).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

// Sin SENTRY_DSN configurado, el SDK no envía nada — queda listo para
// activarse con solo cargar la variable de entorno, sin volver a tocar
// código.
export default withSentryConfig(nextConfig, {
  silent: true,
});
