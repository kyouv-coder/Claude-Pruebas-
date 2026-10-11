"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ActionState } from "./actions";
import { FormField, FormError, inputClass } from "@/components/FormField";

const initialState: ActionState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="token" value={token} />
      <FormError message={state.error} />

      <FormField label="Nueva contraseña" htmlFor="resetPassword" required>
        <input
          id="resetPassword"
          name="password"
          type="password"
          required
          autoFocus
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={inputClass}
        />
      </FormField>

      <FormField label="Confirmar contraseña" htmlFor="resetConfirmPassword" required>
        <input
          id="resetConfirmPassword"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={inputClass}
        />
      </FormField>

      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 mt-2"
      >
        {pending ? "Guardando…" : "Restablecer contraseña"}
      </button>
    </form>
  );
}
