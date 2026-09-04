"use client";

import { useActionState } from "react";
import { createBookingAction, type ActionState } from "./actions";
import { FormField, FormError, FormSuccess, inputClass } from "@/components/FormField";

type Service = { id: string; name: string; durationMinutes: number };
type Staff = { id: string; name: string };

const initialState: ActionState = {};

export function BookingForm({
  services,
  staff,
}: {
  services: Service[];
  staff: Staff[];
}) {
  const [state, formAction, pending] = useActionState(
    createBookingAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <FormField label="Nombre del cliente" htmlFor="clientName" required>
        <input id="clientName" name="clientName" required className={inputClass} />
      </FormField>

      <FormField label="Teléfono" htmlFor="clientPhone">
        <input id="clientPhone" name="clientPhone" className={inputClass} />
      </FormField>

      <FormField label="Email" htmlFor="clientEmail">
        <input
          id="clientEmail"
          name="clientEmail"
          type="email"
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
        <textarea id="notes" name="notes" rows={2} className={inputClass} />
      </FormField>

      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {pending ? "Creando…" : "Crear reserva"}
      </button>
    </form>
  );
}
