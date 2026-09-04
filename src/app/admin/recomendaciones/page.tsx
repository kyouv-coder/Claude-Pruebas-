import Link from "next/link";
import { getRecommendations } from "@/lib/insights";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const severityStyles = {
  alta: "border-danger/30 bg-danger-soft",
  media: "border-border bg-accent-soft",
  info: "border-border bg-surface",
} as const;

const severityLabel = {
  alta: "Urgente",
  media: "Atención",
  info: "Para saber",
} as const;

export default async function RecomendacionesPage() {
  const businessId = await requireAdmin();
  const recommendations = await getRecommendations(businessId);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Recomendaciones</h1>
        <p className="text-sm text-muted mt-1">
          Un resumen automático de lo que conviene mirar hoy, calculado a
          partir de tus propios datos: clientes, stock, giftcards, caja y
          finanzas.
        </p>
      </div>

      {recommendations.length === 0 ? (
        <div className="bg-accent-soft border border-border rounded-lg p-4 text-sm text-ink">
          No hay nada urgente para mostrar hoy. A medida que se acumulen
          reservas, ventas y gastos, este panel va a ir sugiriendo cosas
          concretas.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {recommendations.map((r, i) => (
            <div
              key={i}
              className={`border rounded-lg p-4 ${severityStyles[r.severity]}`}
            >
              <div className="flex items-center justify-between gap-4 mb-1">
                <h2 className="font-medium text-ink text-sm">{r.title}</h2>
                <span className="text-xs text-muted shrink-0">
                  {severityLabel[r.severity]}
                </span>
              </div>
              <p className="text-sm text-muted">{r.description}</p>
              {r.href && (
                <Link
                  href={r.href}
                  className="text-sm text-accent hover:underline mt-2 inline-block"
                >
                  {r.linkLabel ?? "Ver más"} →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
