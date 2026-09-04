import { listServices, listStaff, listUpcomingBookings } from "@/lib/bookings";
import { createBookingAction, cancelBookingAction } from "./actions";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No se presentó",
};

export default async function ReservasPage() {
  const [services, staff, bookings] = await Promise.all([
    listServices(),
    listStaff(),
    listUpcomingBookings(),
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      <section className="bg-white border rounded-lg p-5 h-fit">
        <h2 className="font-semibold mb-4">Nueva reserva</h2>
        <form action={createBookingAction} className="flex flex-col gap-3">
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
            placeholder="Email (opcional)"
            type="email"
            className="border rounded px-3 py-2 text-sm"
          />
          <select name="serviceId" required className="border rounded px-3 py-2 text-sm">
            <option value="">Servicio…</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.durationMinutes} min)
              </option>
            ))}
          </select>
          <select name="staffId" required className="border rounded px-3 py-2 text-sm">
            <option value="">Profesional…</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              name="date"
              type="date"
              required
              className="border rounded px-3 py-2 text-sm flex-1"
            />
            <input
              name="time"
              type="time"
              required
              className="border rounded px-3 py-2 text-sm flex-1"
            />
          </div>
          <textarea
            name="notes"
            placeholder="Notas (opcional)"
            className="border rounded px-3 py-2 text-sm"
            rows={2}
          />
          <button
            type="submit"
            className="bg-black text-white rounded px-3 py-2 text-sm font-medium hover:bg-neutral-800"
          >
            Crear reserva
          </button>
        </form>
        {services.length === 0 && (
          <p className="text-xs text-amber-600 mt-3">
            No hay servicios cargados todavía — corré <code>npx prisma db seed</code>.
          </p>
        )}
      </section>

      <section className="bg-white border rounded-lg p-5">
        <h2 className="font-semibold mb-4">Próximas reservas ({bookings.length})</h2>
        <div className="flex flex-col divide-y">
          {bookings.length === 0 && (
            <p className="text-sm text-neutral-500 py-4">No hay reservas próximas.</p>
          )}
          {bookings.map((b) => (
            <div key={b.id} className="py-3 flex items-center justify-between gap-4">
              <div className="text-sm">
                <div className="font-medium">
                  {b.startTime.toLocaleString("es-AR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {" — "}
                  {b.client.name}
                </div>
                <div className="text-neutral-500">
                  {b.service.name} · {b.staff.name} ·{" "}
                  <span
                    className={
                      b.status === "CANCELLED"
                        ? "text-red-500"
                        : b.status === "COMPLETED"
                          ? "text-green-600"
                          : "text-neutral-500"
                    }
                  >
                    {statusLabel[b.status]}
                  </span>
                </div>
              </div>
              {b.status !== "CANCELLED" && (
                <form
                  action={async () => {
                    "use server";
                    await cancelBookingAction(b.id);
                  }}
                >
                  <button
                    type="submit"
                    className="text-xs text-red-600 hover:underline"
                  >
                    Cancelar
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
