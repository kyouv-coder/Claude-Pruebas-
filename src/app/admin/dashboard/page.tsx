import Link from "next/link";
import { getDashboardStats } from "@/lib/dashboard";
import { getMonthlyFinancials, getMonthlyTrend, currentYearMonth } from "@/lib/finance";
import { StatCard } from "@/components/StatCard";
import {
  RevenueTrendChart,
  TopServicesChart,
  NetProfitTrendChart,
} from "@/components/DashboardCharts";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

export default async function DashboardPage() {
  const { year, month } = currentYearMonth();
  const [stats, monthFinancials, netTrend] = await Promise.all([
    getDashboardStats(),
    getMonthlyFinancials(year, month),
    getMonthlyTrend(6),
  ]);
  const netColor =
    monthFinancials.net > 0
      ? "text-success"
      : monthFinancials.net < 0
        ? "text-danger"
        : "text-ink";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink">Dashboard</h1>

      {!stats.hasActivity && (
        <div className="bg-accent-soft border border-border rounded-lg p-4 text-sm text-ink">
          Todavía no hay reservas ni ventas registradas. Las métricas de abajo
          van a empezar a completarse en cuanto se cree la primera reserva y
          se cobre en caja.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Reservas de hoy"
          value={String(stats.todaysBookingsCount)}
        />
        <StatCard
          label="Ingresos (últimos 7 días)"
          value={money(stats.revenueLast7)}
        />
        <StatCard
          label="Ingresos (últimos 30 días)"
          value={money(stats.revenueLast30)}
        />
        <StatCard
          label="Ticket promedio"
          value={money(stats.ticketPromedio)}
        />
        <StatCard
          label="Ocupación de hoy"
          value={pct(stats.occupancyRateToday)}
          hint="minutos reservados / capacidad del staff"
        />
        <StatCard
          label="Tasa de cancelación (30d)"
          value={pct(stats.cancellationRate)}
        />
        <StatCard
          label="Tasa de no-show (30d)"
          value={pct(stats.noShowRate)}
        />
        <StatCard
          label="Saldo pendiente en giftcards"
          value={money(stats.outstandingGiftCardBalance)}
        />
      </div>

      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="font-display text-base text-ink">Ingresos por día (14 días)</h2>
          <span className="text-xs text-muted">
            Proyección próximos 30 días: {money(stats.projectedRevenueNext30)}
          </span>
        </div>
        <RevenueTrendChart data={stats.revenueTrend} />
      </div>

      <div className="bg-surface border border-border rounded-lg p-4">
        <h2 className="font-display text-base text-ink mb-2">
          Servicios más solicitados (30 días)
        </h2>
        {stats.topServices.length > 0 ? (
          <TopServicesChart data={stats.topServices} />
        ) : (
          <p className="text-sm text-muted py-6">
            Todavía no hay reservas para calcular este ranking.
          </p>
        )}
      </div>

      <div className="bg-surface border border-border rounded-lg p-4">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-base text-ink">
            Resultado del mes (ingresos − gastos)
          </h2>
          <Link
            href="/admin/finanzas"
            className="text-xs text-accent hover:underline"
          >
            Cargar gastos e impuestos →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 mb-4">
          <div>
            <div className="text-xs text-muted">Ingresos</div>
            <div className="font-display text-xl text-ink mt-1">
              {money(monthFinancials.revenue)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">Gastos</div>
            <div className="font-display text-xl text-ink mt-1">
              {money(monthFinancials.expenses)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted">Ganancia neta</div>
            <div className={`font-display text-xl mt-1 ${netColor}`}>
              {money(monthFinancials.net)}
            </div>
          </div>
        </div>
        <NetProfitTrendChart
          data={netTrend.map((m) => ({ label: m.label, net: m.net }))}
        />
      </div>
    </div>
  );
}
