import "dotenv/config";
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireAdmin = vi.fn();
const listExpensesForMonth = vi.fn();

vi.mock("@/lib/auth", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("@/lib/finance", async () => {
  const actual = await vi.importActual<typeof import("@/lib/finance")>("@/lib/finance");
  return {
    ...actual,
    listExpensesForMonth: (...args: unknown[]) => listExpensesForMonth(...args),
  };
});

const { GET } = await import("./route");

// El export de gastos es información financiera (igual que el de ventas en
// caja/export): reservado a ADMIN, y el CSV tiene que reflejar exactamente
// lo que devuelve la consulta del mes, con el nombre de archivo esperado
// por año/mes para que el usuario pueda identificarlo al descargarlo.
describe("GET /admin/finanzas/export", () => {
  it("propaga el redirect si quien llama no es ADMIN", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    requireAdmin.mockRejectedValueOnce(redirectError);
    const request = new NextRequest("http://localhost/admin/finanzas/export");

    await expect(GET(request)).rejects.toBe(redirectError);
    expect(listExpensesForMonth).not.toHaveBeenCalled();
  });

  it("devuelve un CSV con los gastos del mes pedido y el nombre de archivo correcto", async () => {
    requireAdmin.mockResolvedValueOnce("biz-1");
    listExpensesForMonth.mockResolvedValueOnce([
      {
        date: new Date("2024-03-05T12:00:00Z"),
        category: "Insumos",
        description: "Shampoo",
        amount: 1500.5,
      },
    ]);
    const request = new NextRequest(
      "http://localhost/admin/finanzas/export?year=2024&month=3"
    );

    const response = await GET(request);
    const csv = await response.text();

    expect(listExpensesForMonth).toHaveBeenCalledWith("biz-1", 2024, 3);
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="gastos-2024-03.csv"'
    );
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(csv).toContain("Categoría");
    expect(csv).toContain("Insumos");
    expect(csv).toContain("Shampoo");
    expect(csv).toContain("1500.50");
  });

  it("usa el mes/año actual cuando no vienen (o son inválidos) en la query", async () => {
    requireAdmin.mockResolvedValueOnce("biz-1");
    listExpensesForMonth.mockResolvedValueOnce([]);
    const request = new NextRequest(
      "http://localhost/admin/finanzas/export?year=not-a-number&month=99"
    );

    await GET(request);

    const now = new Date();
    expect(listExpensesForMonth).toHaveBeenCalledWith(
      "biz-1",
      now.getFullYear(),
      now.getMonth() + 1
    );
  });
});
