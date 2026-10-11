import Link from "next/link";
import {
  listGiftCards,
  getGiftCardStats,
  countGiftCards,
  GIFT_CARDS_PAGE_SIZE,
} from "@/lib/giftcards";
import { requireBusinessId } from "@/lib/auth";
import { formatCurrency as money, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

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

export default async function GiftCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const businessId = await requireBusinessId();
  const { page: pageParam } = await searchParams;
  const requestedPage = Number(pageParam ?? "1");
  const page =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? Math.floor(requestedPage)
      : 1;
  const [giftCards, stats, total] = await Promise.all([
    listGiftCards(businessId, {
      skip: (page - 1) * GIFT_CARDS_PAGE_SIZE,
      take: GIFT_CARDS_PAGE_SIZE,
    }),
    getGiftCardStats(businessId),
    countGiftCards(businessId),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / GIFT_CARDS_PAGE_SIZE));

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
                          ? formatDate(g.expiresAt)
                          : "Sin vencimiento"}
                      </td>
                      <td className={`px-4 py-3 font-medium ${status.color}`}>
                        {status.label}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {formatDate(g.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <nav
          aria-label="Paginación de giftcards"
          className="flex items-center justify-between text-sm"
        >
          {page > 1 ? (
            <Link
              href={`/admin/giftcards?page=${page - 1}`}
              className="text-accent hover:underline"
            >
              ← Anterior
            </Link>
          ) : (
            <span />
          )}
          <span className="text-muted">
            Página {page} de {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/giftcards?page=${page + 1}`}
              className="text-accent hover:underline"
            >
              Siguiente →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
