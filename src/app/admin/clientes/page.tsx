import Link from "next/link";
import { listClients, countClients, CLIENTS_PAGE_SIZE } from "@/lib/clients";
import { requireBusinessId, getCurrentUser } from "@/lib/auth";
import { getVerticalCopy } from "@/lib/verticals";
import { formatCurrency as money, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ClientesPage({
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
  const [clients, user, total] = await Promise.all([
    listClients(businessId, {
      skip: (page - 1) * CLIENTS_PAGE_SIZE,
      take: CLIENTS_PAGE_SIZE,
    }),
    getCurrentUser(),
    countClients(businessId),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / CLIENTS_PAGE_SIZE));
  const copy = getVerticalCopy(user?.business.businessType);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">{copy.clientLabel}</h1>
        <p className="text-sm text-muted mt-1">
          Historial y ficha de cada {copy.clientLabelSingular}: qué se hizo,
          cuánto gastó, y notas para dar un servicio personalizado.
        </p>
      </div>

      <section className="bg-surface border border-border rounded-lg overflow-hidden">
        {clients.length === 0 ? (
          <p className="text-sm text-muted p-4">
            Todavía no hay clientes cargados. Se crean solos al hacer una
            reserva o una venta.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Nombre</th>
                  <th scope="col" className="px-4 py-3 font-medium">Contacto</th>
                  <th scope="col" className="px-4 py-3 font-medium">Visitas</th>
                  <th scope="col" className="px-4 py-3 font-medium">Gastado total</th>
                  <th scope="col" className="px-4 py-3 font-medium">Última visita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/clientes/${c.id}`}
                        className="text-accent hover:underline font-medium"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {c.phone ?? c.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-ink">{c.bookingsCount}</td>
                    <td className="px-4 py-3 text-ink">{money(c.totalSpent)}</td>
                    <td className="px-4 py-3 text-muted">
                      {c.lastVisit ? formatDate(c.lastVisit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <nav
          aria-label={`Paginación de ${copy.clientLabel.toLowerCase()}`}
          className="flex items-center justify-between text-sm"
        >
          {page > 1 ? (
            <Link
              href={`/admin/clientes?page=${page - 1}`}
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
              href={`/admin/clientes?page=${page + 1}`}
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
