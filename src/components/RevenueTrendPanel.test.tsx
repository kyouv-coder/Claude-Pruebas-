import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { RevenueTrendPanel } from "./RevenueTrendPanel";

vi.mock("./DashboardCharts", () => ({
  RevenueTrendChart: ({
    data,
    ariaLabel,
    tickFormatter,
  }: {
    data: { date: string; revenue: number }[];
    ariaLabel: string;
    tickFormatter: (date: string) => string;
  }) => (
    <div data-testid="chart" aria-label={ariaLabel}>
      {data.map((d) => (
        <span key={d.date} data-testid="point">
          {tickFormatter(d.date)}:{d.revenue}
        </span>
      ))}
    </div>
  ),
}));

afterEach(() => {
  cleanup();
});

const daily14 = [{ date: "2026-10-20", revenue: 1000 }];
const daily30 = [{ date: "2026-10-01", revenue: 2000 }];
const monthly = [{ date: "2026-10", revenue: 30000 }];
const yearly = [{ date: "2025", revenue: 400000 }];

function renderPanel() {
  return render(
    <RevenueTrendPanel
      daily14={daily14}
      daily30={daily30}
      monthly={monthly}
      yearly={yearly}
      projectedRevenueNext30={5000}
    />,
  );
}

describe("RevenueTrendPanel", () => {
  it("muestra por defecto el período de 2 semanas con formato de fecha corto", () => {
    renderPanel();

    expect(screen.getByRole("tab", { name: "2 semanas" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("point")).toHaveTextContent("10-20:1000");
  });

  it("muestra la proyección de ingresos a 30 días", () => {
    renderPanel();

    expect(screen.getByText(/Proyección próximos 30 días/)).toHaveTextContent("$ 5.000,00");
  });

  it("cambia a datos mensuales sin recortar la fecha al seleccionar esa pestaña", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("tab", { name: "Mensual" }));

    expect(screen.getByRole("tab", { name: "Mensual" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("point")).toHaveTextContent("2026-10:30000");
  });

  it("cambia a datos anuales sin recortar la fecha", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("tab", { name: "Anual" }));

    expect(screen.getByTestId("point")).toHaveTextContent("2025:400000");
  });

  it("cambia a diario de 30 días recortando la fecha igual que en 2 semanas", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("tab", { name: "Diario (30 días)" }));

    expect(screen.getByTestId("point")).toHaveTextContent("10-01:2000");
  });
});
