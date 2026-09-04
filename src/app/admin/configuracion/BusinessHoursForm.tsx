"use client";

import { useActionState } from "react";
import { updateBusinessHoursAction, type ActionState } from "./actions";
import { FormError, FormSuccess } from "@/components/FormField";
import { DAY_NAMES, type DayHours } from "@/lib/business-hours-shared";

const initialState: ActionState = {};

export function BusinessHoursForm({ hours, isConfigured }: { hours: DayHours[]; isConfigured: boolean }) {
  const [state, formAction, pending] = useActionState(updateBusinessHoursAction, initialState);

  return (
    <div className="bg-surface border border-border rounded-lg p-5 max-w-lg">
      <p className="text-sm text-muted mb-3">
        {isConfigured
          ? "La reserva pública solo permite elegir horarios dentro de este rango."
          : "Mientras no guardes un horario, la reserva pública no restringe ningún día ni hora (solo evita choques con turnos ya tomados)."}
      </p>
      <form action={formAction} className="flex flex-col gap-3" noValidate>
        <FormError message={state.error} />
        <FormSuccess message={state.success} />

        <div className="flex flex-col gap-2">
          {DAY_NAMES.map((name, dayOfWeek) => {
            const day = hours[dayOfWeek];
            return (
              <div key={dayOfWeek} className="flex items-center gap-2 text-sm">
                <span className="w-24 shrink-0 text-ink">{name}</span>
                <label className="flex items-center gap-1 shrink-0">
                  <input
                    type="checkbox"
                    name={`closed_${dayOfWeek}`}
                    defaultChecked={day.closed}
                    className="accent-ink"
                  />
                  <span className="text-muted">Cerrado</span>
                </label>
                <input
                  type="time"
                  name={`open_${dayOfWeek}`}
                  defaultValue={day.openTime}
                  aria-label={`Hora de apertura los ${name.toLowerCase()}`}
                  className="border border-border rounded-md px-2 py-1 text-sm bg-surface text-ink"
                />
                <span className="text-muted">a</span>
                <input
                  type="time"
                  name={`close_${dayOfWeek}`}
                  defaultValue={day.closeTime}
                  aria-label={`Hora de cierre los ${name.toLowerCase()}`}
                  className="border border-border rounded-md px-2 py-1 text-sm bg-surface text-ink"
                />
              </div>
            );
          })}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 self-start mt-2"
        >
          {pending ? "Guardando…" : "Guardar horario"}
        </button>
      </form>
    </div>
  );
}
