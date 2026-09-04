"use client";

import { useActionState } from "react";
import { signupAction, type ActionState } from "./actions";
import { FormField, FormError, inputClass } from "@/components/FormField";

const initialState: ActionState = {};

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <FormError message={state.error} />

      <FormField label="Nombre de tu negocio" htmlFor="signupBusinessName" required>
        <input
          id="signupBusinessName"
          name="businessName"
          required
          autoFocus
          autoComplete="organization"
          placeholder="Ej: Spa Luna"
          className={inputClass}
        />
      </FormField>

      <FormField label="Tu nombre" htmlFor="signupName" required>
        <input
          id="signupName"
          name="name"
          required
          autoComplete="name"
          className={inputClass}
        />
      </FormField>

      <FormField label="Email" htmlFor="signupEmail" required>
        <input
          id="signupEmail"
          name="email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
      </FormField>

      <FormField label="Contraseña" htmlFor="signupPassword" required>
        <input
          id="signupPassword"
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
          className={inputClass}
        />
      </FormField>

      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 mt-2"
      >
        {pending ? "Creando cuenta…" : "Crear mi cuenta"}
      </button>
    </form>
  );
}
