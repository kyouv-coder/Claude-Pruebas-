import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Pública a propósito: es la foto de portada del negocio en su página de
// reservas, pensada para mostrarse sin necesidad de sesión.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { coverImageData: true, coverImageMimeType: true },
  });

  if (!business?.coverImageData || !business.coverImageMimeType) {
    return NextResponse.json({ error: "Sin foto de portada." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(business.coverImageData), {
    headers: {
      "Content-Type": business.coverImageMimeType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
