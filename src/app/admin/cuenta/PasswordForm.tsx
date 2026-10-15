"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePasswordAction, type ActionState } from "./actions";
import { FormField, FormError, FormSuccess, inputClass } from "@/components/FormField";

const initialState: ActionState = {};

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // A diferencia de los formularios de servicios/productos/staff (donde
  // dejar los valores después de guardar es útil para seguir editando), acá
  // conviene limpiar los tres campos tras un cambio exitoso: son contraseñas
  // que no tiene sentido dejar escritas en la pantalla (la actual ya quedó
  // obsoleta, y la nueva no debería seguir visible/autocompletable).
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
    }
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3 max-w-sm" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <FormField label="Contraseña actual" htmlFor="currentPassword" required>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={inputClass}
        />
      </FormField>

      <FormField label="Nueva contraseña" htmlFor="newPassword" required>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={inputClass}
        />
      </FormField>

      <FormField label="Confirmar nueva contraseña" htmlFor="confirmPassword" required>
        <input
          id="confirmPassword"
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
        className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 mt-2 self-start"
      >
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
