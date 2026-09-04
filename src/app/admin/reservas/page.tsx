import { listServices, listStaff, listUpcomingBookings } from "@/lib/bookings";
import { requireBusinessId } from "@/lib/auth";
import { BookingForm } from "./BookingForm";
import { CancelBookingButton } from "./CancelBookingButton";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No se presentó",
};

// text-danger is reserved for destructive actions (e.g. "Cancelar"); past/neutral
// statuses use text-muted so they don't read as an alert.
const statusColor: Record<string, string> = {
  PENDING: "text-muted",
  CONFIRMED: "text-accent",
  COMPLETED: "text-success",
  CANCELLED: "text-muted",
  NO_SHOW: "text-muted",
};

export default async function ReservasPage() {
  const businessId = await requireBusinessId();
  const [services, staff, bookings] = await Promise.all([
    listServices(businessId),
    listStaff(businessId),
    listUpcomingBookings(businessId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-2xl text-ink">Reservas</h1>

      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <section className="bg-surface border border-border rounded-lg p-5 h-fit">
          <h2 className="font-display text-lg text-ink mb-4">Nueva reserva</h2>
          <BookingForm services={services} staff={staff} />
          {services.length === 0 && (
            <p className="text-xs text-muted mt-3">
              No hay servicios cargados todavía — corré{" "}
              <code className="bg-accent-soft px-1 rounded">
                npm run db:seed
              </code>
              .
            </p>
          )}
        </section>

        <section className="bg-surface border border-border rounded-lg p-5">
          <h2 className="font-display text-lg text-ink mb-4">
            Próximas reservas ({bookings.length})
          </h2>
          <div className="flex flex-col divide-y divide-border">
            {bookings.length === 0 && (
              <p className="text-sm text-muted py-4">No hay reservas próximas.</p>
            )}
            {bookings.map((b) => (
              <div
                key={b.id}
                className="py-3 flex items-center justify-between gap-4"
              >
                <div className="text-sm">
                  <div className="font-medium text-ink">
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
                  <div className="text-muted">
                    {b.service.name} · {b.staff.name} ·{" "}
                    <span className={statusColor[b.status]}>
                      {statusLabel[b.status]}
                    </span>
                  </div>
                </div>
                {b.status !== "CANCELLED" && (
                  <CancelBookingButton bookingId={b.id} clientName={b.client.name} />
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
