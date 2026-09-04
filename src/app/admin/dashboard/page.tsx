import { getDashboardStats } from "@/lib/dashboard";
import { StatCard } from "@/components/StatCard";
import { RevenueTrendChart, TopServicesChart } from "@/components/DashboardCharts";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink">Dashboard</h1>

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
    </div>
  );
}
