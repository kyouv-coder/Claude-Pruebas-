import { listAllServices, listAllStaff } from "@/lib/settings";
import { ServiceManager } from "./ServiceManager";
import { StaffManager } from "./StaffManager";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const [services, staff] = await Promise.all([
    listAllServices(),
    listAllStaff(),
  ]);

  const serviceRows = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    durationMinutes: s.durationMinutes,
    price: Number(s.price),
    active: s.active,
  }));

  const staffRows = staff.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    active: u.active,
  }));

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl text-ink">Configuración</h1>
        <p className="text-sm text-muted mt-1">
          Gestioná los servicios, precios y el staff del negocio. Desactivar
          en vez de borrar mantiene el historial de reservas y ventas intacto.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg text-ink">Servicios</h2>
        <ServiceManager services={serviceRows} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg text-ink">Staff</h2>
        <StaffManager staff={staffRows} />
      </section>
    </div>
  );
}
