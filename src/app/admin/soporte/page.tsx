import { getCurrentUser } from "@/lib/auth";
import { getVerticalCopy } from "@/lib/verticals";
import { SUPPORT_EMAIL, SUPPORT_WHATSAPP } from "@/lib/support";

export const dynamic = "force-dynamic";

const FAQ = [
  {
    q: "¿Cómo agrego un servicio o producto nuevo?",
    a: "Configuración → Servicios (o Productos) → completá el formulario de arriba.",
  },
  {
    q: "¿Cómo doy de alta a alguien del staff?",
    a: "Configuración → Staff. Vas a ver el email y la contraseña inicial una sola vez — compartíselos por privado.",
  },
  {
    q: "¿Cómo comparto el link de reservas online con mis clientes?",
    a: "Configuración → Reservas online. Ahí está el link listo para copiar y pegar en redes o WhatsApp.",
  },
  {
    q: "¿Por qué no me deja reservar en ciertos horarios desde el link público?",
    a: "Si configuraste un horario de atención en Configuración, la reserva pública solo permite elegir dentro de esa franja. Los turnos que ya están ocupados tampoco se pueden re-reservar.",
  },
  {
    q: "Me equivoqué al cerrar la caja o cargar una venta, ¿cómo lo corrijo?",
    a: "Todavía no hay edición retroactiva de caja cerrada. Escribinos por soporte y te ayudamos a corregirlo del lado de la base de datos.",
  },
];

export default async function SoportePage() {
  const user = await getCurrentUser();
  const copy = getVerticalCopy(user?.business.businessType);

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl text-ink">Soporte</h1>
        <p className="text-sm text-muted mt-1">
          Ayuda para vos, la persona que administra {copy.label.toLowerCase()} —
          no para tus clientes.
        </p>
      </div>

      <section className="bg-surface border border-border rounded-lg p-5">
        <h2 className="font-display text-base text-ink mb-2">Contactanos</h2>
        <p className="text-sm text-muted mb-3">
          ¿Algo no funciona, o necesitás ayuda que no está en las preguntas de
          abajo? Escribinos directamente.
        </p>
        <div className="flex flex-col gap-1 text-sm">
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent hover:underline">
            {SUPPORT_EMAIL}
          </a>
          {SUPPORT_WHATSAPP && (
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              WhatsApp: {SUPPORT_WHATSAPP}
            </a>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-base text-ink">Preguntas frecuentes</h2>
        {FAQ.map((item, i) => (
          <details key={i} className="bg-surface border border-border rounded-lg p-4 group">
            <summary className="text-sm font-medium text-ink cursor-pointer">{item.q}</summary>
            <p className="text-sm text-muted mt-2">{item.a}</p>
          </details>
        ))}
      </section>
    </div>
  );
}
