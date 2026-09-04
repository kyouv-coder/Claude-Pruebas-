import Link from "next/link";
import { listClients } from "@/lib/clients";
import { requireBusinessId } from "@/lib/auth";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export default async function ClientesPage() {
  const businessId = await requireBusinessId();
  const clients = await listClients(businessId);
  const sorted = [...clients].sort((a, b) => b.totalSpent - a.totalSpent);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Clientes</h1>
        <p className="text-sm text-muted mt-1">
          Historial y ficha de cada cliente: qué se hizo, cuánto gastó, y
          notas para dar un servicio personalizado.
        </p>
      </div>

      <section className="bg-surface border border-border rounded-lg overflow-hidden">
        {sorted.length === 0 ? (
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
                {sorted.map((c) => (
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
                      {c.lastVisit ? c.lastVisit.toLocaleDateString("es-AR") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
