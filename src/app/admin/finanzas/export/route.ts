import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { listExpensesForMonth, currentYearMonth } from "@/lib/finance";
import { toCsv, csvResponse } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const businessId = await requireAdmin();
  const current = currentYearMonth();
  const year = Number(request.nextUrl.searchParams.get("year")) || current.year;
  const month = Number(request.nextUrl.searchParams.get("month")) || current.month;

  const expenses = await listExpensesForMonth(businessId, year, month);

  const csv = toCsv(
    expenses.map((e) => ({
      fecha: e.date.toLocaleDateString("es-AR"),
      categoria: e.category,
      descripcion: e.description ?? "",
      monto: Number(e.amount).toFixed(2),
    })),
    [
      { key: "fecha", header: "Fecha" },
      { key: "categoria", header: "Categoría" },
      { key: "descripcion", header: "Descripción" },
      { key: "monto", header: "Monto" },
    ]
  );

  return csvResponse(csv, `gastos-${year}-${String(month).padStart(2, "0")}.csv`);
}
