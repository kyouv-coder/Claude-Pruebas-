import "dotenv/config";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { GET } from "./route";

// Ruta pública (sin sesión) que sirve la foto de un servicio en la página de
// reserva de un negocio. El código ya scopea la consulta por
// `business: { slug }`, pero eso nunca se había probado a nivel de ruta HTTP
// real: que pedir el id de un servicio de OTRO negocio, aunque se use el
// slug del negocio correcto en la URL, no filtra esa foto.
const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("GET /reservar/[slug]/imagen-servicio/[serviceId]", () => {
  it("returns 404 for a service that belongs to a different business than the slug (no leak by guessed id)", async () => {
    const businessA = await prisma.business.create({
      data: { name: "Negocio A", businessType: "SPA", slug: `pub-img-serv-a-${Date.now()}` },
    });
    const businessB = await prisma.business.create({
      data: { name: "Negocio B", businessType: "SPA", slug: `pub-img-serv-b-${Date.now()}` },
    });
    const serviceOfB = await prisma.service.create({
      data: {
        businessId: businessB.id,
        name: "Servicio de B",
        durationMinutes: 30,
        price: 1000,
        imageData: Buffer.from([1, 2, 3]),
        imageMimeType: "image/png",
      },
    });

    try {
      const request = new NextRequest(
        `http://localhost/reservar/${businessA.slug}/imagen-servicio/${serviceOfB.id}`
      );
      const response = await GET(request, {
        params: Promise.resolve({ slug: businessA.slug, serviceId: serviceOfB.id }),
      });
      expect(response.status).toBe(404);
    } finally {
      await prisma.service.deleteMany({ where: { businessId: businessB.id } });
      await prisma.business.deleteMany({ where: { id: { in: [businessA.id, businessB.id] } } });
      await prisma.$disconnect();
    }
  });

  it("serves the image bytes and content-type when the service belongs to the slug's own business", async () => {
    const business = await prisma.business.create({
      data: { name: "Negocio C", businessType: "SPA", slug: `pub-img-serv-c-${Date.now()}` },
    });
    const service = await prisma.service.create({
      data: {
        businessId: business.id,
        name: "Servicio propio",
        durationMinutes: 30,
        price: 1000,
        imageData: Buffer.from([9, 8, 7, 6]),
        imageMimeType: "image/png",
      },
    });

    try {
      const request = new NextRequest(
        `http://localhost/reservar/${business.slug}/imagen-servicio/${service.id}`
      );
      const response = await GET(request, {
        params: Promise.resolve({ slug: business.slug, serviceId: service.id }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/png");
      const bytes = new Uint8Array(await response.arrayBuffer());
      expect(Array.from(bytes)).toEqual([9, 8, 7, 6]);
    } finally {
      await prisma.service.deleteMany({ where: { businessId: business.id } });
      await prisma.business.delete({ where: { id: business.id } });
      await prisma.$disconnect();
    }
  });

  it("returns 404 for a non-existent slug", async () => {
    const business = await prisma.business.create({
      data: { name: "Negocio D", businessType: "SPA", slug: `pub-img-serv-d-${Date.now()}` },
    });
    const service = await prisma.service.create({
      data: {
        businessId: business.id,
        name: "Servicio propio",
        durationMinutes: 30,
        price: 1000,
        imageData: Buffer.from([1]),
        imageMimeType: "image/png",
      },
    });

    try {
      const request = new NextRequest(
        `http://localhost/reservar/no-existe-${Date.now()}/imagen-servicio/${service.id}`
      );
      const response = await GET(request, {
        params: Promise.resolve({ slug: `no-existe-${Date.now()}`, serviceId: service.id }),
      });
      expect(response.status).toBe(404);
    } finally {
      await prisma.service.deleteMany({ where: { businessId: business.id } });
      await prisma.business.delete({ where: { id: business.id } });
      await prisma.$disconnect();
    }
  });
});
