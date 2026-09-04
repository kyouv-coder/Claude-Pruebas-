import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Pública a propósito: foto del producto en la página de reservas del
// negocio. Se valida que el producto pertenezca al negocio del slug para
// no exponer fotos de otro negocio por id adivinado.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; productId: string }> }
) {
  const { slug, productId } = await params;
  const product = await prisma.product.findFirst({
    where: { id: productId, business: { slug } },
    select: { imageData: true, imageMimeType: true },
  });

  if (!product?.imageData || !product.imageMimeType) {
    return NextResponse.json({ error: "Sin foto para este producto." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(product.imageData), {
    headers: {
      "Content-Type": product.imageMimeType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
