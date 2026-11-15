"use client";

import { useRef, useState } from "react";
import { RevenueTrendChart } from "./DashboardCharts";
import { formatCurrency as money } from "@/lib/format";

type Period = "14d" | "30d" | "12m" | "3y";

const PERIODS: { key: Period; label: string }[] = [
  { key: "14d", label: "2 semanas" },
  { key: "30d", label: "Diario (30 días)" },
  { key: "12m", label: "Mensual" },
  { key: "3y", label: "Anual" },
];

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
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
      <div
        className="flex flex-wrap gap-1 mb-3"
        role="tablist"
        aria-label="Período del gráfico de ingresos"
        onKeyDown={(e) => {
          // Patrón ARIA de tabs (WAI-ARIA Authoring Practices): las flechas
          // izquierda/derecha y Home/End mueven el foco entre pestañas y las
          // activan, en vez de depender solo de Tab — sin esto, marcar estos
          // botones con role="tab" prometía (vía aria-selected/role) un
          // comportamiento de teclado que en los hechos no estaba implementado,
          // confuso para quien navega con lector de pantalla y espera ese patrón.
          const currentIndex = PERIODS.findIndex((p) => p.key === period);
          let nextIndex: number | null = null;
          if (e.key === "ArrowRight") {
            nextIndex = (currentIndex + 1) % PERIODS.length;
          } else if (e.key === "ArrowLeft") {
            nextIndex = (currentIndex - 1 + PERIODS.length) % PERIODS.length;
          } else if (e.key === "Home") {
            nextIndex = 0;
          } else if (e.key === "End") {
            nextIndex = PERIODS.length - 1;
          }
          if (nextIndex !== null) {
            e.preventDefault();
            setPeriod(PERIODS[nextIndex].key);
            tabRefs.current[nextIndex]?.focus();
          }
        }}
      >
        {PERIODS.map((p, i) => (
          <button
            key={p.key}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={period === p.key}
            tabIndex={period === p.key ? 0 : -1}
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
