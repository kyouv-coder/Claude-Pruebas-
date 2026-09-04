import { notFound } from "next/navigation";
import { getBusinessBySlug, listPublicServices, listPublicStaff } from "@/lib/public-booking";
import { getBusinessHours, hasConfiguredHours, DAY_NAMES } from "@/lib/business-hours";
import { PublicBookingForm } from "./PublicBookingForm";

export const dynamic = "force-dynamic";

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  return { title: business ? `Reservar en ${business.name}` : "Reservar" };
}

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await getBusinessBySlug(slug);
  if (!business) notFound();

  const [services, staff, hoursConfigured] = await Promise.all([
    listPublicServices(business.id),
    listPublicStaff(business.id),
    hasConfiguredHours(business.id),
  ]);
  const hours = hoursConfigured ? await getBusinessHours(business.id) : null;

  return (
    <div className="min-h-screen bg-paper">
      <div className="relative">
        {business.coverImageMimeType ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagen servida por una API propia, no un dominio remoto configurable
          <img
            src={`/reservar/${slug}/imagen-negocio`}
            alt=""
            className="w-full h-48 sm:h-64 object-cover"
          />
        ) : (
          <div className="w-full h-24 bg-accent-soft" aria-hidden="true" />
        )}
        <div
          className={`max-w-2xl mx-auto px-4 ${
            business.coverImageMimeType ? "-mt-10 relative" : "pt-8"
          }`}
        >
          <div className="bg-surface border border-border rounded-lg p-5 text-center shadow-sm">
            <h1 className="font-display text-2xl text-ink">{business.name}</h1>
            <p className="text-sm text-muted mt-1">{business.copy.bookingsSubtitle}</p>
            {business.description && (
              <p className="text-sm text-ink mt-3 whitespace-pre-line">{business.description}</p>
            )}
            {business.address && (
              <p className="text-xs text-muted mt-2">📍 {business.address}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
        {hours && (
          <details className="bg-surface border border-border rounded-lg p-4">
            <summary className="text-sm font-medium text-ink cursor-pointer">
              Horario de atención
            </summary>
            <ul className="text-sm text-muted mt-3 flex flex-col gap-1">
              {hours.map((h) => (
                <li key={h.dayOfWeek} className="flex justify-between">
                  <span>{DAY_NAMES[h.dayOfWeek]}</span>
                  <span>{h.closed ? "Cerrado" : `${h.openTime}–${h.closeTime}`}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        {services.length > 0 && (
          <div>
            <h2 className="font-display text-lg text-ink mb-3">{business.copy.serviceLabel}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="bg-surface border border-border rounded-lg overflow-hidden flex flex-col"
                >
                  {s.hasImage ? (
                    // eslint-disable-next-line @next/next/no-img-element -- imagen servida por una API propia, no un dominio remoto configurable
                    <img
                      src={`/reservar/${slug}/imagen-servicio/${s.id}`}
                      alt=""
                      className="w-full h-32 object-cover"
                    />
                  ) : (
                    <div className="w-full h-16 bg-accent-soft" aria-hidden="true" />
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium text-ink">{s.name}</p>
                    {s.description && (
                      <p className="text-xs text-muted mt-1">{s.description}</p>
                    )}
                    <p className="text-xs text-muted mt-1">
                      {s.durationMinutes} min · {money(Number(s.price))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-surface border border-border rounded-lg p-6">
          <h2 className="font-display text-lg text-ink mb-4">{business.copy.newBookingCta}</h2>
          {services.length === 0 ? (
            <p className="text-sm text-muted text-center">
              Este negocio todavía no cargó servicios disponibles para reservar
              online. Contactalo directamente.
            </p>
          ) : (
            <PublicBookingForm
              slug={slug}
              services={services.map((s) => ({
                id: s.id,
                name: s.name,
                durationMinutes: s.durationMinutes,
                price: Number(s.price),
              }))}
              staff={staff.map((s) => ({ id: s.id, name: s.name }))}
              ctaLabel={business.copy.newBookingCta}
            />
          )}
        </div>

        {business.cancellationPolicy && (
          <div className="text-xs text-muted bg-surface border border-border rounded-lg p-3">
            <p className="font-medium text-ink mb-1">Política de cancelación</p>
            <p className="whitespace-pre-line">{business.cancellationPolicy}</p>
          </div>
        )}
      </div>
    </div>
  );
}
