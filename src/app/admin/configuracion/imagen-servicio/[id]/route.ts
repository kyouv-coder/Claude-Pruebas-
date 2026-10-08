import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getServiceImage } from "@/lib/settings";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const businessId = await requireAdmin();
  const { id } = await params;

  const image = await getServiceImage(businessId, id);
  if (!image) {
    return NextResponse.json({ error: "Sin foto para este servicio." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(image.data), {
    // A diferencia de las fotos públicas (/reservar/[slug]/imagen-*), que ya
    // tenían Cache-Control, estas tres rutas de /admin/configuracion no
    // mandaban ninguno — el navegador volvía a pedir la imagen completa a la
    // base en cada carga de la pantalla de Configuración. "private" (no
    // "public" como las públicas) porque esta ruta exige sesión de admin:
    // no debería quedar cacheada en un proxy o CDN compartido.
    headers: { "Content-Type": image.mimeType, "Cache-Control": "private, max-age=3600" },
  });
}
