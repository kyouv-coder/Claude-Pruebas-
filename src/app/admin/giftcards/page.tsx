import { listGiftCards, getGiftCardStats } from "@/lib/giftcards";
import { requireBusinessId } from "@/lib/auth";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function statusOf(giftCard: {
  active: boolean;
  balance: unknown;
  expiresAt: Date | null;
}) {
  const balance = Number(giftCard.balance);
  if (balance <= 0) return { label: "Agotada", color: "text-muted" };
  if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
    return { label: "Vencida", color: "text-danger" };
  }
  if (!giftCard.active) return { label: "Inactiva", color: "text-muted" };
  return { label: "Activa", color: "text-success" };
}

export default async function GiftCardsPage() {
  const businessId = await requireBusinessId();
  const [giftCards, stats] = await Promise.all([
    listGiftCards(businessId),
    getGiftCardStats(businessId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Giftcards</h1>
        <p className="text-sm text-muted mt-1">
          Todas las giftcards vendidas: cuánto queda por entregar y a quién.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-muted">Giftcards emitidas</div>
          <div className="font-display text-2xl text-ink mt-1">{stats.total}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-muted">Activas con saldo</div>
          <div className="font-display text-2xl text-ink mt-1">{stats.activeCount}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <div className="text-xs text-muted">Saldo pendiente de entregar</div>
          <div className="font-display text-2xl text-ink mt-1">
            {money(stats.outstandingBalance)}
          </div>
        </div>
      </div>

      <section className="bg-surface border border-border rounded-lg overflow-hidden">
        {giftCards.length === 0 ? (
          <p className="text-sm text-muted p-4">
            Todavía no se vendió ninguna giftcard. Se venden desde Caja.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Código</th>
                  <th scope="col" className="px-4 py-3 font-medium">Cliente</th>
                  <th scope="col" className="px-4 py-3 font-medium">Saldo</th>
                  <th scope="col" className="px-4 py-3 font-medium">Valor inicial</th>
                  <th scope="col" className="px-4 py-3 font-medium">Vencimiento</th>
                  <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                  <th scope="col" className="px-4 py-3 font-medium">Emitida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {giftCards.map((g) => {
                  const status = statusOf(g);
                  return (
                    <tr key={g.id}>
                      <td className="px-4 py-3 font-mono text-xs text-ink">{g.code}</td>
                      <td className="px-4 py-3 text-ink">
                        {g.purchasedBy?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-ink">{money(Number(g.balance))}</td>
                      <td className="px-4 py-3 text-muted">
                        {money(Number(g.initialValue))}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {g.expiresAt
                          ? g.expiresAt.toLocaleDateString("es-AR")
                          : "Sin vencimiento"}
                      </td>
                      <td className={`px-4 py-3 font-medium ${status.color}`}>
                        {status.label}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {g.createdAt.toLocaleDateString("es-AR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
