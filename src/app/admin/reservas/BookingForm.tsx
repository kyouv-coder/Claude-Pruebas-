"use client";

import { useActionState, useEffect, useRef } from "react";
import { createBookingAction, type ActionState } from "./actions";
import { FormField, FormError, FormSuccess, inputClass } from "@/components/FormField";

type Service = { id: string; name: string; durationMinutes: number };
type Staff = { id: string; name: string };

const initialState: ActionState = {};

export function BookingForm({
  services,
  staff,
  ctaLabel = "Crear reserva",
}: {
  services: Service[];
  staff: Staff[];
  ctaLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(
    createBookingAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Este panel queda visible en la página (no se cierra ni redirige tras
  // crear la reserva), así que si no limpiamos los campos después de un
  // alta exitosa quedan los datos del cliente anterior cargados: fácil
  // fuente de un alta duplicada o con la fecha/hora equivocada si el
  // usuario no se da cuenta y vuelve a tocar "Crear".
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <FormField label="Nombre del cliente" htmlFor="clientName" required>
        <input id="clientName" name="clientName" required maxLength={150} className={inputClass} />
      </FormField>

      <FormField label="Teléfono" htmlFor="clientPhone">
        <input id="clientPhone" name="clientPhone" maxLength={30} className={inputClass} />
      </FormField>

      <FormField label="Email" htmlFor="clientEmail">
        <input
          id="clientEmail"
          name="clientEmail"
          type="email"
          maxLength={255}
          className={inputClass}
        />
      </FormField>

      <FormField label="Servicio" htmlFor="serviceId" required>
        <select id="serviceId" name="serviceId" required className={inputClass}>
          <option value="">Elegir…</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.durationMinutes} min)
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Profesional" htmlFor="staffId" required>
        <select id="staffId" name="staffId" required className={inputClass}>
          <option value="">Elegir…</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </FormField>

      <div className="flex gap-2">
        <FormField label="Fecha" htmlFor="date" required>
          <input
            id="date"
            name="date"
            type="date"
            required
            className={inputClass}
          />
        </FormField>
        <FormField label="Hora" htmlFor="time" required>
          <input
            id="time"
            name="time"
            type="time"
            required
            className={inputClass}
          />
        </FormField>
      </div>

      <FormField label="Notas" htmlFor="notes">
        <textarea id="notes" name="notes" rows={2} maxLength={1000} className={inputClass} />
      </FormField>

      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {pending ? "Creando…" : ctaLabel}
      </button>
    </form>
  );
}
