import {
  getOpenCashSession,
  getCashSessionSummary,
  getTodaysUnpaidBookings,
} from "@/lib/pos";
import { chargeBookingAction } from "./actions";
import {
  OpenCashForm,
  CloseCashForm,
  SellGiftCardForm,
  RedeemGiftCardForm,
} from "./CajaForms";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export default async function CajaPage() {
  const session = await getOpenCashSession();

  if (!session) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-2xl text-ink">Caja</h1>
        <div className="max-w-sm bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display text-lg text-ink mb-4">Abrir caja</h2>
          <OpenCashForm />
        </div>
      </div>
    );
  }

  const [summary, pendingBookings] = await Promise.all([
    getCashSessionSummary(session.id),
    getTodaysUnpaidBookings(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink">Caja</h1>

      <section className="bg-surface border border-border rounded-lg p-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg text-ink">
            Caja abierta desde {session.openedAt.toLocaleString("es-AR")}
          </h2>
          <p className="text-sm text-muted mt-1">
            Apertura: {money(Number(session.openingAmount))} · Ventas:{" "}
            {summary.salesCount} ({money(summary.total)})
          </p>
        </div>
        <CloseCashForm sessionId={session.id} />
      </section>

      <section className="bg-surface border border-border rounded-lg p-5">
        <h2 className="font-display text-lg text-ink mb-4">
          Reservas de hoy pendientes de cobro ({pendingBookings.length})
        </h2>
        <div className="flex flex-col divide-y divide-border">
          {pendingBookings.length === 0 && (
            <p className="text-sm text-muted py-4">
              No hay reservas pendientes de cobro hoy.
            </p>
          )}
          {pendingBookings.map((b) => (
            <div key={b.id} className="py-3 flex items-center justify-between gap-4">
              <div className="text-sm">
                <div className="font-medium text-ink">
                  {b.startTime.toLocaleTimeString("es-AR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  — {b.client.name}
                </div>
                <div className="text-muted">
                  {b.service.name} ({money(Number(b.service.price))}) · {b.staff.name}
                </div>
              </div>
              <form action={chargeBookingAction} className="flex items-center gap-2">
                <input type="hidden" name="bookingId" value={b.id} />
                <input type="hidden" name="cashSessionId" value={session.id} />
                <label htmlFor={`pm-${b.id}`} className="sr-only">
                  Método de pago
                </label>
                <select
                  id={`pm-${b.id}`}
                  name="paymentMethod"
                  className="border border-border rounded-md px-2 py-1 text-xs bg-surface text-ink"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta</option>
                  <option value="TRANSFER">Transferencia</option>
                </select>
                <button
                  type="submit"
                  className="bg-ink text-paper rounded-md px-3 py-1.5 text-xs font-medium hover:opacity-90"
                >
                  Cobrar
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display text-lg text-ink mb-4">Vender giftcard</h2>
          <SellGiftCardForm cashSessionId={session.id} />
        </section>

        <section className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display text-lg text-ink mb-4">Canjear giftcard</h2>
          <RedeemGiftCardForm cashSessionId={session.id} />
        </section>
      </div>
    </div>
  );
}
