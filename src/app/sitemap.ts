import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { listPublicBusinessSlugs } from "@/lib/public-booking";

// Sin esto, los buscadores solo podían descubrir las páginas públicas de
// reserva (/reservar/[slug]) si llegaban a ellas por un link externo —
// `robots.txt` las permite rastrear, pero nada les decía que existen. Un
// sitemap les da la lista completa de una, incluida la landing y las
// páginas legales.
//
// Dinámico a propósito: la lista de negocios cambia con cada alta nueva, y
// generarlo en build time (como Next hace por defecto con sitemap.ts)
// requeriría conexión a la base durante el build, igual que
// /reservar/[slug] ya evita con `dynamic = "force-dynamic"`.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getSiteUrl();
  const businesses = await listPublicBusinessSlugs();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/signup`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${baseUrl}/terminos`, changeFrequency: "yearly", priority: 0.1 },
    { url: `${baseUrl}/privacidad`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const businessEntries: MetadataRoute.Sitemap = businesses.map((business) => ({
    url: `${baseUrl}/reservar/${business.slug}`,
    lastModified: business.createdAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...businessEntries];
}
