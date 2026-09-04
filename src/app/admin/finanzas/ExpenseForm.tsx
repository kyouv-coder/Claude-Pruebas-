"use client";

import { useActionState } from "react";
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
  return new Date().toISOString().slice(0, 10);
}

export function ExpenseForm() {
  const [state, formAction, pending] = useActionState(
    createExpenseAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
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
        <input id="expDescription" name="description" className={inputClass} />
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
