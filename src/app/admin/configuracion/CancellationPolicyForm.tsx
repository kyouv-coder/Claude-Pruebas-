"use client";

import { useActionState } from "react";
import { updateCancellationPolicyAction, type ActionState } from "./actions";
import { FormError, FormSuccess } from "@/components/FormField";

const initialState: ActionState = {};

export function CancellationPolicyForm({ currentPolicy }: { currentPolicy: string | null }) {
  const [state, formAction, pending] = useActionState(updateCancellationPolicyAction, initialState);

  return (
    <div className="bg-surface border border-border rounded-lg p-5 max-w-lg">
      <p className="text-sm text-muted mb-3">
        Texto libre que se muestra en la página de reserva online, antes de
        que el cliente confirme. Esto es solo informativo: todavía no cobra
        una seña ni bloquea la reserva — para eso hace falta definir con vos
        un medio de pago.
      </p>
      <form action={formAction} className="flex flex-col gap-3" noValidate>
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
        <textarea
          name="cancellationPolicy"
          rows={4}
          maxLength={1000}
          placeholder="Ej: Las cancelaciones se aceptan hasta 24hs antes del turno. Pasado ese plazo, se cobra el 50% del servicio en la próxima visita."
          defaultValue={currentPolicy ?? ""}
          className="border border-border rounded-md px-3 py-2 text-sm bg-surface text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-accent"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 self-start"
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </form>
    </div>
  );
}
