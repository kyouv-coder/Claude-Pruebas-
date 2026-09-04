import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSaleInvoiceFile } from "@/lib/finance";

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
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${file.fileName}"`,
    },
  });
}
