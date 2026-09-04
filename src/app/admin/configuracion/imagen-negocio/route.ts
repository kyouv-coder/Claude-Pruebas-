import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getBusinessCoverImage } from "@/lib/settings";

export async function GET() {
  const businessId = await requireAdmin();

  const image = await getBusinessCoverImage(businessId);
  if (!image) {
    return NextResponse.json({ error: "Sin foto de portada." }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(image.data), {
    headers: { "Content-Type": image.mimeType },
  });
}
