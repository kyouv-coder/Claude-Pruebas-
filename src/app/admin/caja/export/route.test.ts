import "dotenv/config";
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const requireAdmin = vi.fn();
const listSalesForMonth = vi.fn();

vi.mock("@/lib/auth", () => ({ requireAdmin: () => requireAdmin() }));
vi.mock("@/lib/finance", async () => {
  const actual = await vi.importActual<typeof import("@/lib/finance")>("@/lib/finance");
  return {
    ...actual,
    listSalesForMonth: (...args: unknown[]) => listSalesForMonth(...args),
  };
});

const { GET } = await import("./route");

// Igual que el export de gastos: reservado a ADMIN, y el detalle de items
// de cada venta tiene que quedar legible en una sola columna del CSV.
describe("GET /admin/caja/export", () => {
  it("propaga el redirect si quien llama no es ADMIN", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    requireAdmin.mockRejectedValueOnce(redirectError);
    const request = new NextRequest("http://localhost/admin/caja/export");

    await expect(GET(request)).rejects.toBe(redirectError);
    expect(listSalesForMonth).not.toHaveBeenCalled();
  });

  it("devuelve un CSV con las ventas del mes pedido, el detalle de items y el nombre de archivo correcto", async () => {
    requireAdmin.mockResolvedValueOnce("biz-1");
    listSalesForMonth.mockResolvedValueOnce([
      {
        createdAt: new Date("2024-03-05T12:00:00Z"),
        client: { name: "Ana Pérez" },
        items: [
          { quantity: 2, description: "Corte" },
          { quantity: 1, description: "Tintura" },
        ],
        paymentMethod: "EFECTIVO",
        total: 3500,
      },
    ]);
    const request = new NextRequest(
      "http://localhost/admin/caja/export?year=2024&month=3"
    );

    const response = await GET(request);
    const csv = await response.text();

    expect(listSalesForMonth).toHaveBeenCalledWith("biz-1", 2024, 3);
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="ventas-2024-03.csv"'
    );
    expect(csv).toContain("Ana Pérez");
    expect(csv).toContain("2x Corte | 1x Tintura");
    expect(csv).toContain("EFECTIVO");
    expect(csv).toContain("3500.00");
  });

  it("no rompe cuando la venta no tiene cliente asociado", async () => {
    requireAdmin.mockResolvedValueOnce("biz-1");
    listSalesForMonth.mockResolvedValueOnce([
      {
        createdAt: new Date("2024-03-05T12:00:00Z"),
        client: null,
        items: [{ quantity: 1, description: "Corte" }],
        paymentMethod: "TARJETA",
        total: 1000,
      },
    ]);
    const request = new NextRequest(
      "http://localhost/admin/caja/export?year=2024&month=3"
    );

    const response = await GET(request);
    const csv = await response.text();

    expect(csv).not.toContain("null");
    expect(csv).not.toContain("undefined");
    expect(csv).toContain("1x Corte");
  });
});
