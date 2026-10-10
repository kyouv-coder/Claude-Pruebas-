// URL pública base de la app, usada para resolver URLs absolutas en metadata
// (metadataBase, Open Graph, sitemap.xml). Sin esto, las imágenes de
// Open Graph de /reservar/[slug] (rutas relativas, ej. /reservar/mi-spa/imagen-negocio)
// se resuelven contra "http://localhost:3000" en cualquier deploy — WhatsApp,
// Slack o Facebook no pueden mostrar la vista previa de un link compartido de
// la reserva pública porque la imagen apunta a localhost.
//
// Prioridad: NEXT_PUBLIC_APP_URL (configurable, dominio real una vez que se
// decida) > VERCEL_PROJECT_PRODUCTION_URL / VERCEL_URL (que Vercel completa
// solo, sin configuración) > localhost en desarrollo.
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercelUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}
