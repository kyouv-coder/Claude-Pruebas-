"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupAction, type ActionState } from "./actions";
import { FormField, FormError, inputClass } from "@/components/FormField";
import { BUSINESS_TYPE_OPTIONS } from "@/lib/verticals";

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

      <FormField label="Rubro de tu negocio" htmlFor="signupBusinessType" required>
        <select
          id="signupBusinessType"
          name="businessType"
          required
          defaultValue=""
          className={inputClass}
        >
          <option value="" disabled>
            Elegí una opción…
          </option>
          {BUSINESS_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
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

      <p className="text-xs text-muted">
        Al crear tu cuenta aceptás los{" "}
        <Link href="/terminos" target="_blank" className="text-accent hover:underline">
          Términos de Servicio
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" target="_blank" className="text-accent hover:underline">
          Política de Privacidad
        </Link>
        .
      </p>

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
