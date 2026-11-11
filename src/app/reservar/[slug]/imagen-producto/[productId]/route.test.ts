import "dotenv/config";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

// Hermano del test de imagen-servicio: la ruta pública de foto de producto
// en la página de reserva también scopea por `business: { slug }`, pero
// nunca tuvo un test a nivel de ruta HTTP real que confirme que un id de
// producto de OTRO negocio no filtra su foto, aunque se use el slug del
// negocio correcto en la URL.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("GET /reservar/[slug]/imagen-producto/[productId]", () => {
  it("returns 404 for a product that belongs to a different business than the slug (no leak by guessed id)", async () => {
    const businessA = await prisma.business.create({
      data: { name: "Negocio A", businessType: "SPA", slug: `pub-img-prod-a-${Date.now()}` },
    });
    const businessB = await prisma.business.create({
      data: { name: "Negocio B", businessType: "SPA", slug: `pub-img-prod-b-${Date.now()}` },
    });
    const productOfB = await prisma.product.create({
      data: {
        businessId: businessB.id,
        name: "Producto de B",
        price: 1000,
        stock: 1,
        imageData: Buffer.from([1, 2, 3]),
        imageMimeType: "image/png",
      },
    });

    try {
      const request = new NextRequest(
        `http://localhost/reservar/${businessA.slug}/imagen-producto/${productOfB.id}`
      );
      const response = await GET(request, {
        params: Promise.resolve({ slug: businessA.slug, productId: productOfB.id }),
      });
      expect(response.status).toBe(404);
    } finally {
      await prisma.product.deleteMany({ where: { businessId: businessB.id } });
      await prisma.business.deleteMany({ where: { id: { in: [businessA.id, businessB.id] } } });
      await prisma.$disconnect();
    }
  });

  it("serves the image bytes and content-type when the product belongs to the slug's own business", async () => {
    const business = await prisma.business.create({
      data: { name: "Negocio C", businessType: "SPA", slug: `pub-img-prod-c-${Date.now()}` },
    });
    const product = await prisma.product.create({
      data: {
        businessId: business.id,
        name: "Producto propio",
        price: 1000,
        stock: 1,
        imageData: Buffer.from([9, 8, 7, 6]),
        imageMimeType: "image/png",
      },
    });

    try {
      const request = new NextRequest(
        `http://localhost/reservar/${business.slug}/imagen-producto/${product.id}`
      );
      const response = await GET(request, {
        params: Promise.resolve({ slug: business.slug, productId: product.id }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/png");
      const bytes = new Uint8Array(await response.arrayBuffer());
      expect(Array.from(bytes)).toEqual([9, 8, 7, 6]);
    } finally {
      await prisma.product.deleteMany({ where: { businessId: business.id } });
      await prisma.business.delete({ where: { id: business.id } });
      await prisma.$disconnect();
    }
  });

  it("returns 404 for a non-existent slug", async () => {
    const business = await prisma.business.create({
      data: { name: "Negocio D", businessType: "SPA", slug: `pub-img-prod-d-${Date.now()}` },
    });
    const product = await prisma.product.create({
      data: {
        businessId: business.id,
        name: "Producto propio",
        price: 1000,
        stock: 1,
        imageData: Buffer.from([1]),
        imageMimeType: "image/png",
      },
    });

    try {
      const request = new NextRequest(
        `http://localhost/reservar/no-existe-${Date.now()}/imagen-producto/${product.id}`
      );
      const response = await GET(request, {
        params: Promise.resolve({ slug: `no-existe-${Date.now()}`, productId: product.id }),
      });
      expect(response.status).toBe(404);
    } finally {
      await prisma.product.deleteMany({ where: { businessId: business.id } });
      await prisma.business.delete({ where: { id: business.id } });
      await prisma.$disconnect();
    }
  });
});
