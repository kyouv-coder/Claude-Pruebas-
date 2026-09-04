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
    headers: { "Content-Type": image.mimeType },
  });
}
