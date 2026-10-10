import type { MetadataRoute } from "next";

// Sin este archivo, Next no manda ningún /robots.txt — un buscador podía
// rastrear e indexar /admin/* (siempre redirige a /login sin sesión, así que
// no expone datos, pero no tiene sentido ocupar crawl budget ni que
// aparezcan en resultados de búsqueda URLs de /login?next=/admin/... con
// rutas internas) y /api/* (incluido el cron, ya protegido por su propio
// secreto, pero tampoco pensado para ser indexado). La página pública de
// reserva (/reservar/[slug]) y el marketing (/, /signup, /login, /terminos,
// /privacidad) siguen abiertos a cualquier buscador.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/"],
    },
  };
}
