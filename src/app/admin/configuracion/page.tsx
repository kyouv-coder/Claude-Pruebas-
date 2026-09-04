import { listAllServices, listAllProducts, listAllStaff } from "@/lib/settings";
import { requireBusinessId } from "@/lib/auth";
import { ServiceManager } from "./ServiceManager";
import { ProductManager } from "./ProductManager";
import { StaffManager } from "./StaffManager";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const businessId = await requireBusinessId();
  const [services, products, staff] = await Promise.all([
    listAllServices(businessId),
    listAllProducts(businessId),
    listAllStaff(businessId),
  ]);

  const serviceRows = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    durationMinutes: s.durationMinutes,
    price: Number(s.price),
    active: s.active,
  }));

  const productRows = products.map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    stock: p.stock,
    active: p.active,
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
        <h2 className="font-display text-lg text-ink">Productos</h2>
        <ProductManager products={productRows} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-lg text-ink">Staff</h2>
        <StaffManager staff={staffRows} />
      </section>
    </div>
  );
}
