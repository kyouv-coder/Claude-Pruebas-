"use client";

import { useActionState } from "react";
import { updateSlackWebhookAction, type ActionState } from "./actions";
import { FormField, FormError, FormSuccess, inputClass } from "@/components/FormField";

const initialState: ActionState = {};

export function SlackForm({ currentUrl }: { currentUrl: string | null }) {
  const [state, formAction, pending] = useActionState(updateSlackWebhookAction, initialState);

  return (
    <div className="bg-surface border border-border rounded-lg p-5 max-w-md">
      <p className="text-sm text-muted mb-3">
        {currentUrl
          ? "Las notificaciones de nuevas reservas se están enviando a Slack."
          : "Pegá la URL de un Incoming Webhook de Slack para recibir un mensaje cada vez que alguien reserva un turno."}
      </p>
      <form action={formAction} className="flex flex-col gap-3" noValidate>
        <FormError message={state.error} />
        <FormSuccess message={state.success} />
        <FormField label="Webhook URL de Slack" htmlFor="slackWebhookUrl">
          <input
            id="slackWebhookUrl"
            name="slackWebhookUrl"
            type="url"
            placeholder="https://hooks.slack.com/services/..."
            defaultValue={currentUrl ?? ""}
            className={inputClass}
          />
        </FormField>
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
