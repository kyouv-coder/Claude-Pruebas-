import Link from "next/link";
import { getDashboardStats } from "@/lib/dashboard";
import { getMonthlyFinancials, getMonthlyTrend, getYearlyTrend, currentYearMonth } from "@/lib/finance";
import { getRecommendations } from "@/lib/insights";
import { getOnboardingStatus } from "@/lib/onboarding";
import { requireAdmin, getCurrentUser } from "@/lib/auth";
import { getVerticalCopy } from "@/lib/verticals";
import { StatCard } from "@/components/StatCard";
import { OnboardingChecklist } from "@/components/OnboardingChecklist";
import { TopServicesChart, NetProfitTrendChart } from "@/components/DashboardCharts";
import { RevenueTrendPanel } from "@/components/RevenueTrendPanel";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function pct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

export default async function DashboardPage() {
  const businessId = await requireAdmin();
  const { year, month } = currentYearMonth();
  const [stats, monthFinancials, netTrend, revenueMonthlyTrend, revenueYearlyTrend, recommendations, user, onboarding] =
    await Promise.all([
      getDashboardStats(businessId),
      getMonthlyFinancials(businessId, year, month),
      getMonthlyTrend(businessId, 6),
      getMonthlyTrend(businessId, 12),
      getYearlyTrend(businessId, 3),
      getRecommendations(businessId),
      getCurrentUser(),
      getOnboardingStatus(businessId),
    ]);
  const copy = getVerticalCopy(user?.business.businessType);
  const topRecommendations = recommendations.filter((r) => r.severity !== "info").slice(0, 2);
  const netColor =
    monthFinancials.net > 0
      ? "text-success"
      : monthFinancials.net < 0
        ? "text-danger"
        : "text-ink";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Dashboard</h1>
        <p className="text-sm text-muted mt-1">{copy.tagline}</p>
      </div>

      {!onboarding.isComplete ? (
        <OnboardingChecklist status={onboarding} />
      ) : (
        !stats.hasActivity && (
          <div className="bg-accent-soft border border-border rounded-lg p-4 text-sm text-ink">
            Todavía no hay reservas ni ventas registradas. Las métricas de abajo
            van a empezar a completarse en cuanto se cree la primera reserva y
            se cobre en caja.
          </div>
        )
      )}

      {topRecommendations.length > 0 && (
        <div className="flex flex-col gap-2">
          {topRecommendations.map((r, i) => (
            <div
              key={i}
              className={`border rounded-lg p-3 text-sm flex items-center justify-between gap-4 ${
                r.severity === "alta"
                  ? "border-danger/30 bg-danger-soft"
                  : "border-border bg-accent-soft"
              }`}
            >
              <span className="text-ink font-medium">{r.title}</span>
              <Link
                href="/admin/recomendaciones"
                className="text-accent hover:underline shrink-0"
              >
                Ver detalle →
              </Link>
            </div>
          ))}
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

      <RevenueTrendPanel
        daily14={stats.revenueTrend}
        daily30={stats.revenueTrend30}
        monthly={revenueMonthlyTrend.map((m) => ({ date: m.label, revenue: m.revenue }))}
        yearly={revenueYearlyTrend.map((y) => ({ date: y.label, revenue: y.revenue }))}
        projectedRevenueNext30={stats.projectedRevenueNext30}
      />

      <div className="bg-surface border border-border rounded-lg p-4">
        <h2 className="font-display text-base text-ink mb-2">
          Servicios más solicitados (30 días)
        </h2>
        {stats.topServices.length > 0 ? (
          <TopServicesChart
            data={stats.topServices}
            ariaLabel={`Gráfico de barras: ${stats.topServices
              .map((s) => `${s.name}, ${s.count} reservas`)
              .join("; ")}.`}
          />
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
          ariaLabel={`Gráfico de barras: ganancia neta mensual de los últimos meses, ${netTrend
            .map((m) => `${m.label}: ${money(m.net)}`)
            .join("; ")}.`}
        />
      </div>
    </div>
  );
}
