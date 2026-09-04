import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Pública a propósito: foto del servicio en la página de reservas del
// negocio. Se valida que el servicio pertenezca al negocio del slug para
// no exponer fotos de otro negocio por id adivinado.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; serviceId: string }> }
) {
  const { slug, serviceId } = await params;
  const service = await prisma.service.findFirst({
    where: { id: serviceId, business: { slug } },
    select: { imageData: true, imageMimeType: true },
  });

  if (!service?.imageData || !service.imageMimeType) {
    return NextResponse.json({ error: "Sin foto para este servicio." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(service.imageData), {
    headers: {
      "Content-Type": service.imageMimeType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
