"use client";

import { useActionState } from "react";
import { forgotPasswordAction, type ActionState } from "./actions";
import { FormField, FormError, FormSuccess, inputClass } from "@/components/FormField";

const initialState: ActionState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  if (state.success) {
    return <FormSuccess message={state.success} />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <FormError message={state.error} />

      <FormField label="Email" htmlFor="forgotEmail" required>
        <input
          id="forgotEmail"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          className={inputClass}
        />
      </FormField>

      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 mt-2"
      >
        {pending ? "Enviando…" : "Enviar link"}
      </button>
    </form>
  );
}
