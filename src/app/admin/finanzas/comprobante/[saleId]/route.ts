import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSaleInvoiceFile, sanitizeFileNameForHeader } from "@/lib/finance";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ saleId: string }> }
) {
  const businessId = await requireAdmin();
  const { saleId } = await params;

  const file = await getSaleInvoiceFile(businessId, saleId);
  if (!file) {
    return NextResponse.json({ error: "No hay comprobante para esta venta." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.data), {
    // Mismo patrón que las fotos de Configuración (imagen-negocio,
    // imagen-servicio, imagen-producto): el comprobante adjunto de una venta
    // no cambia una vez subido, pero esta ruta no mandaba ningún
    // Cache-Control, así que el navegador lo volvía a descargar completo
    // cada vez que se abría — a diferencia de esas fotos, ya corregidas.
    // `private` (no `public`) porque es un documento de este negocio.
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${sanitizeFileNameForHeader(file.fileName)}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
