import { prisma } from "@/lib/prisma";

function slugify(text: string) {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca tildes
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

// Genera un slug único a partir del nombre del negocio, agregando un
// sufijo numérico si ya existe (spa-luna, spa-luna-2, spa-luna-3, ...).
export async function generateUniqueSlug(name: string) {
  const base = slugify(name) || "negocio";
  let candidate = base;
  let suffix = 1;

  while (await prisma.business.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}
