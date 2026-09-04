import { notFound } from "next/navigation";
import { getBusinessBySlug, listPublicServices, listPublicStaff } from "@/lib/public-booking";
import { PublicBookingForm } from "./PublicBookingForm";

export const dynamic = "force-dynamic";

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

  const [services, staff] = await Promise.all([
    listPublicServices(business.id),
    listPublicStaff(business.id),
  ]);

  return (
    <div className="min-h-screen bg-paper px-4 py-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <h1 className="font-display text-2xl text-ink">{business.name}</h1>
          <p className="text-sm text-muted mt-1">{business.copy.bookingsSubtitle}</p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
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
      </div>
    </div>
  );
}
