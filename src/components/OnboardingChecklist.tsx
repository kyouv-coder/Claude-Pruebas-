import Link from "next/link";
import type { OnboardingStatus } from "@/lib/onboarding";

export function OnboardingChecklist({ status }: { status: OnboardingStatus }) {
  const steps = [
    {
      done: status.hasServices,
      label: "Cargar al menos un servicio (nombre, duración, precio)",
    },
    {
      done: status.hasStaff,
      label: "Dar de alta al staff que va a atender turnos",
    },
    {
      done: status.hasSlackWebhook,
      label: "Conectar Slack para recibir avisos de nuevas reservas (opcional)",
      optional: true,
    },
    {
      done: status.hasBusinessHours,
      label: "Definir el horario de atención para la reserva online (opcional)",
      optional: true,
    },
  ];

  return (
    <div className="bg-accent-soft border border-border rounded-lg p-4">
      <h2 className="font-display text-base text-ink mb-1">Poné en marcha tu negocio</h2>
      <p className="text-sm text-muted mb-3">
        Faltan estos pasos para que las reservas y la página pública de
        reservas online funcionen.
      </p>
      <ul className="flex flex-col gap-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                step.done
                  ? "bg-success border-success text-paper"
                  : "border-muted text-transparent"
              }`}
            >
              ✓
            </span>
            <span className={step.done ? "text-success line-through" : "text-ink"}>
              <span className="sr-only">{step.done ? "(completado) " : "(pendiente) "}</span>
              {step.label}
              {step.optional && !step.done ? " — opcional" : ""}
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/admin/configuracion"
        className="inline-block mt-3 text-sm text-accent hover:underline"
      >
        Ir a Configuración →
      </Link>
    </div>
  );
}
