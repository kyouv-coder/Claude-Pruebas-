"use client";

import { useActionState } from "react";
import { updateClientNotesAction, type ActionState } from "../actions";
import { FormError, FormSuccess, inputClass } from "@/components/FormField";

const initialState: ActionState = {};

export function NotesForm({ clientId, notes }: { clientId: string; notes: string | null }) {
  const [state, formAction, pending] = useActionState(updateClientNotesAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="id" value={clientId} />
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <label htmlFor="notes" className="sr-only">
        Notas del cliente
      </label>
      <textarea
        id="notes"
        name="notes"
        rows={4}
        defaultValue={notes ?? ""}
        placeholder="Alergias, preferencias, cosas a tener en cuenta…"
        className={inputClass}
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 self-start"
      >
        {pending ? "Guardando…" : "Guardar notas"}
      </button>
    </form>
  );
}
