import { NextRequest } from "next/server";
import { requireBusinessId } from "@/lib/auth";
import { listSalesForMonth } from "@/lib/finance";
import { currentYearMonth } from "@/lib/finance";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const businessId = await requireBusinessId();
  const current = currentYearMonth();
  const year = Number(request.nextUrl.searchParams.get("year")) || current.year;
  const month = Number(request.nextUrl.searchParams.get("month")) || current.month;

  const sales = await listSalesForMonth(businessId, year, month);

  const csv = toCsv(
    sales.map((s) => ({
      fecha: s.createdAt.toLocaleString("es-AR"),
      cliente: s.client?.name ?? "",
      detalle: s.items.map((i) => `${i.quantity}x ${i.description}`).join(" | "),
      metodoPago: s.paymentMethod,
      total: Number(s.total).toFixed(2),
    })),
    [
      { key: "fecha", header: "Fecha" },
      { key: "cliente", header: "Cliente" },
      { key: "detalle", header: "Detalle" },
      { key: "metodoPago", header: "Método de pago" },
      { key: "total", header: "Total" },
    ]
  );

  return csvResponse(csv, `ventas-${year}-${String(month).padStart(2, "0")}.csv`);
}
