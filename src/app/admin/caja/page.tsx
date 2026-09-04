import {
  getOpenCashSession,
  getCashSessionSummary,
  getTodaysUnpaidBookings,
} from "@/lib/pos";
import {
  openCashSessionAction,
  closeCashSessionAction,
  chargeBookingAction,
  sellGiftCardAction,
  redeemGiftCardAction,
} from "./actions";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export default async function CajaPage() {
  const session = await getOpenCashSession();

  if (!session) {
    return (
      <div className="max-w-sm bg-white border rounded-lg p-5">
        <h2 className="font-semibold mb-4">Abrir caja</h2>
        <form action={openCashSessionAction} className="flex flex-col gap-3">
          <input
            name="openingAmount"
            type="number"
            step="0.01"
            min="0"
            placeholder="Monto inicial"
            required
            className="border rounded px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="bg-black text-white rounded px-3 py-2 text-sm font-medium hover:bg-neutral-800"
          >
            Abrir caja
          </button>
        </form>
      </div>
    );
  }

  const [summary, pendingBookings] = await Promise.all([
    getCashSessionSummary(session.id),
    getTodaysUnpaidBookings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="bg-white border rounded-lg p-5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">
            Caja abierta — {session.openedAt.toLocaleString("es-AR")}
          </h2>
          <p className="text-sm text-neutral-500 mt-1">
            Apertura: {money(Number(session.openingAmount))} · Ventas: {summary.salesCount} (
            {money(summary.total)})
          </p>
        </div>
        <form action={closeCashSessionAction} className="flex items-center gap-2">
          <input type="hidden" name="sessionId" value={session.id} />
          <input
            name="closingAmount"
            type="number"
            step="0.01"
            min="0"
            placeholder="Monto de cierre"
            required
            className="border rounded px-3 py-2 text-sm w-40"
          />
          <button
            type="submit"
            className="bg-red-600 text-white rounded px-3 py-2 text-sm font-medium hover:bg-red-700"
          >
            Cerrar caja
          </button>
        </form>
      </section>

      <section className="bg-white border rounded-lg p-5">
        <h2 className="font-semibold mb-4">
          Reservas de hoy pendientes de cobro ({pendingBookings.length})
        </h2>
        <div className="flex flex-col divide-y">
          {pendingBookings.length === 0 && (
            <p className="text-sm text-neutral-500 py-4">
              No hay reservas pendientes de cobro hoy.
            </p>
          )}
          {pendingBookings.map((b) => (
            <div key={b.id} className="py-3 flex items-center justify-between gap-4">
              <div className="text-sm">
                <div className="font-medium">
                  {b.startTime.toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  — {b.client.name}
                </div>
                <div className="text-neutral-500">
                  {b.service.name} ({money(Number(b.service.price))}) · {b.staff.name}
                </div>
              </div>
              <form action={chargeBookingAction} className="flex items-center gap-2">
                <input type="hidden" name="bookingId" value={b.id} />
                <input type="hidden" name="cashSessionId" value={session.id} />
                <select
                  name="paymentMethod"
                  className="border rounded px-2 py-1 text-xs"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="TRANSFER">Transferencia</option>
                </select>
                <button
                  type="submit"
                  className="bg-black text-white rounded px-3 py-1.5 text-xs font-medium hover:bg-neutral-800"
                >
                  Cobrar
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-semibold mb-4">Vender giftcard</h2>
          <form action={sellGiftCardAction} className="flex flex-col gap-3">
            <input type="hidden" name="cashSessionId" value={session.id} />
            <input
              name="clientName"
              placeholder="Nombre del cliente"
              required
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              name="clientPhone"
              placeholder="Teléfono (opcional)"
              className="border rounded px-3 py-2 text-sm"
            />
            <input
              name="clientEmail"
              type="email"
              placeholder="Email (opcional)"
              className="border rounded px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <input
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="Monto"
                required
                className="border rounded px-3 py-2 text-sm flex-1"
              />
              <select
                name="paymentMethod"
                className="border rounded px-3 py-2 text-sm"
              >
                <option value="CASH">Efectivo</option>
                <option value="CARD">Tarjeta</option>
                <option value="TRANSFER">Transferencia</option>
              </select>
            </div>
            <button
              type="submit"
              className="bg-black text-white rounded px-3 py-2 text-sm font-medium hover:bg-neutral-800"
            >
              Vender giftcard
            </button>
          </form>
        </section>

        <section className="bg-white border rounded-lg p-5">
          <h2 className="font-semibold mb-4">Canjear giftcard</h2>
          <form action={redeemGiftCardAction} className="flex flex-col gap-3">
            <input type="hidden" name="cashSessionId" value={session.id} />
            <input
              name="code"
              placeholder="Código de giftcard (ej: GC-AB12CD)"
              required
              className="border rounded px-3 py-2 text-sm uppercase"
            />
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="Monto a canjear"
              required
              className="border rounded px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="bg-black text-white rounded px-3 py-2 text-sm font-medium hover:bg-neutral-800"
            >
              Canjear
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
