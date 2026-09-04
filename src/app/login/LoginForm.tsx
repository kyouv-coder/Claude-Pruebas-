"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "./actions";
import { FormField, FormError, inputClass } from "@/components/FormField";

const initialState: ActionState = {};

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="next" value={next ?? "/admin/reservas"} />
      <FormError message={state.error} />

      <FormField label="Email" htmlFor="loginEmail" required>
        <input
          id="loginEmail"
          name="email"
          type="email"
          required
          autoFocus
          className={inputClass}
        />
      </FormField>

      <FormField label="Contraseña" htmlFor="loginPassword" required>
        <input
          id="loginPassword"
          name="password"
          type="password"
          required
          className={inputClass}
        />
      </FormField>

      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 mt-2"
      >
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
