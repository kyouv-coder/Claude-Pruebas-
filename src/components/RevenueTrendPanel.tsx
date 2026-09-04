"use client";

import { useState } from "react";
import { RevenueTrendChart } from "./DashboardCharts";

type Period = "14d" | "30d" | "12m" | "3y";

const PERIODS: { key: Period; label: string }[] = [
  { key: "14d", label: "2 semanas" },
  { key: "30d", label: "Diario (30 días)" },
  { key: "12m", label: "Mensual" },
  { key: "3y", label: "Anual" },
];

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export function RevenueTrendPanel({
  daily14,
  daily30,
  monthly,
  yearly,
  projectedRevenueNext30,
}: {
  daily14: { date: string; revenue: number }[];
  daily30: { date: string; revenue: number }[];
  monthly: { date: string; revenue: number }[];
  yearly: { date: string; revenue: number }[];
  projectedRevenueNext30: number;
}) {
  const [period, setPeriod] = useState<Period>("14d");

  const dataset =
    period === "14d" ? daily14 : period === "30d" ? daily30 : period === "12m" ? monthly : yearly;
  const isDaily = period === "14d" || period === "30d";

  const values = dataset.map((d) => d.revenue);
  const ariaLabel = `Gráfico de línea: ingresos, período "${
    PERIODS.find((p) => p.key === period)?.label
  }", entre ${money(Math.min(...values, 0))} y ${money(Math.max(...values, 0))}.`;

  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
        <h2 className="font-display text-base text-ink">Ingresos</h2>
        <span className="text-xs text-muted">
          Proyección próximos 30 días: {money(projectedRevenueNext30)}
        </span>
      </div>
      <div className="flex flex-wrap gap-1 mb-3" role="tablist" aria-label="Período del gráfico de ingresos">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={period === p.key}
            onClick={() => setPeriod(p.key)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              period === p.key
                ? "bg-ink text-paper border-ink"
                : "bg-surface text-muted border-border hover:text-ink"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <RevenueTrendChart
        data={dataset}
        ariaLabel={ariaLabel}
        tickFormatter={(d) => (isDaily ? d.slice(5) : d)}
      />
    </div>
  );
}
