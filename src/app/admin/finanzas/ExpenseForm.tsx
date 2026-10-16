"use client";

import { useActionState, useEffect, useRef } from "react";
import { createExpenseAction, type ActionState } from "./actions";
import { FormField, FormError, FormSuccess, inputClass } from "@/components/FormField";

const initialState: ActionState = {};

const categoryLabel: Record<string, string> = {
  IMPUESTOS: "Impuestos",
  ALQUILER: "Alquiler",
  INSUMOS: "Insumos",
  SUELDOS: "Sueldos",
  SERVICIOS: "Servicios (luz, internet, etc.)",
  OTRO: "Otro",
};

function todayISO() {
  // Fecha local del navegador, no UTC: toISOString() convierte a UTC, así
  // que entre las 21:00 y las 23:59 (hora Argentina) el campo quedaba
  // precargado con la fecha de "mañana" en vez de la de hoy.
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function ExpenseForm() {
  const [state, formAction, pending] = useActionState(
    createExpenseAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  // Este panel queda visible tras registrar el gasto, así que si no
  // limpiamos los campos queda el monto/descripción anterior cargado:
  // fácil fuente de un alta duplicada si el usuario no se da cuenta.
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <FormField label="Fecha" htmlFor="expDate" required>
        <input
          id="expDate"
          name="date"
          type="date"
          defaultValue={todayISO()}
          required
          className={inputClass}
        />
      </FormField>

      <FormField label="Categoría" htmlFor="expCategory" required>
        <select id="expCategory" name="category" required className={inputClass}>
          {Object.entries(categoryLabel).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Descripción" htmlFor="expDescription">
        <input id="expDescription" name="description" maxLength={500} className={inputClass} />
      </FormField>

      <FormField label="Monto" htmlFor="expAmount" required>
        <input
          id="expAmount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          className={inputClass}
        />
      </FormField>

      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Registrar gasto"}
      </button>
    </form>
  );
}

export { categoryLabel };
