import Link from "next/link";
import { getClientDetail } from "@/lib/clients";
import { requireBusinessId } from "@/lib/auth";
import { NotesForm } from "./NotesForm";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

const statusLabel: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No se presentó",
};

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const businessId = await requireBusinessId();
  const client = await getClientDetail(businessId, id);

  const totalSpent = client.sales.reduce((sum, s) => sum + Number(s.total), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/clientes" className="text-sm text-accent hover:underline">
          ← Todos los clientes
        </Link>
        <h1 className="font-display text-2xl text-ink mt-1">{client.name}</h1>
        <p className="text-sm text-muted mt-1">
          {[client.phone, client.email].filter(Boolean).join(" · ") || "Sin datos de contacto"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-muted">Reservas totales</div>
          <div className="font-display text-2xl text-ink mt-1">{client.bookings.length}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-muted">Gastado total</div>
          <div className="font-display text-2xl text-ink mt-1">{money(totalSpent)}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-muted">Giftcards</div>
          <div className="font-display text-2xl text-ink mt-1">{client.giftCards.length}</div>
        </div>
      </div>

      <section className="bg-surface border border-border rounded-lg p-5">
        <h2 className="font-display text-lg text-ink mb-3">
          Notas (alergias, preferencias)
        </h2>
        <NotesForm clientId={client.id} notes={client.notes} />
      </section>

      <section className="bg-surface border border-border rounded-lg p-5">
        <h2 className="font-display text-lg text-ink mb-4">
          Historial de reservas ({client.bookings.length})
        </h2>
        {client.bookings.length === 0 ? (
          <p className="text-sm text-muted">Todavía no reservó ningún turno.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {client.bookings.map((b) => (
              <div key={b.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                <div>
                  <div className="font-medium text-ink">{b.service.name}</div>
                  <div className="text-muted">
                    {b.startTime.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })} ·{" "}
                    {b.staff.name}
                  </div>
                </div>
                <span className="text-muted">{statusLabel[b.status] ?? b.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="bg-surface border border-border rounded-lg p-5">
        <h2 className="font-display text-lg text-ink mb-4">
          Historial de compras ({client.sales.length})
        </h2>
        {client.sales.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay ventas registradas.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {client.sales.map((s) => (
              <div key={s.id} className="py-3 flex items-center justify-between gap-4 text-sm">
                <div>
                  <div className="font-medium text-ink">
                    {s.items.map((i) => `${i.quantity}x ${i.description}`).join(", ")}
                  </div>
                  <div className="text-muted">
                    {s.createdAt.toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}
                  </div>
                </div>
                <span className="text-ink font-medium">{money(Number(s.total))}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
