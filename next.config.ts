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
          // Sin esto, un usuario que llega por http:// (link viejo, autocompletado
          // del navegador, red wifi con portal cautivo) queda expuesto a que un
          // atacante en el medio intercepte esa primera conexión antes de que
          // Vercel la redirija a https — HSTS le dice al navegador que, una vez
          // visitado el sitio una vez por https, nunca vuelva a intentar http
          // para este dominio durante el período indicado. Sin `preload`
          // (requiere registrar el dominio en una lista pública, no reversible
          // sin esperar meses) para no comprometernos a algo difícil de deshacer.
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
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
