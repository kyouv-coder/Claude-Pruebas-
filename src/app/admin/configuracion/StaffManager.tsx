"use client";

import { useState, useTransition, useActionState } from "react";
import {
  createStaffAction,
  updateStaffAction,
  toggleStaffActiveAction,
  type ActionState,
} from "./actions";
import { FormField, FormError, FormSuccess, inputClass } from "@/components/FormField";

type Staff = {
  id: string;
  name: string;
  email: string;
  active: boolean;
};

const initialState: ActionState = {};

export function StaffManager({ staff }: { staff: Staff[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface border border-border rounded-lg p-5 max-w-md">
        <h3 className="text-sm font-medium text-ink mb-3">Nueva persona</h3>
        <StaffForm />
      </div>
      <div className="bg-surface border border-border rounded-lg divide-y divide-border">
        {staff.length === 0 && (
          <p className="text-sm text-muted p-4">Todavía no hay staff cargado.</p>
        )}
        {staff.map((u) => (
          <StaffRow key={u.id} staff={u} />
        ))}
      </div>
    </div>
  );
}

function StaffForm({ staff, onDone }: { staff?: Staff; onDone?: () => void }) {
  const action = staff ? updateStaffAction : createStaffAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const idSuffix = staff?.id ?? "new";

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {staff && <input type="hidden" name="id" value={staff.id} />}
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <FormField label="Nombre" htmlFor={`staff-name-${idSuffix}`} required>
        <input
          id={`staff-name-${idSuffix}`}
          name="name"
          defaultValue={staff?.name}
          required
          className={inputClass}
        />
      </FormField>
      <FormField label="Email" htmlFor={`staff-email-${idSuffix}`} required>
        <input
          id={`staff-email-${idSuffix}`}
          name="email"
          type="email"
          defaultValue={staff?.email}
          required
          className={inputClass}
        />
      </FormField>
      {!staff && (
        <FormField label="Contraseña inicial" htmlFor={`staff-password-${idSuffix}`} required>
          <input
            id={`staff-password-${idSuffix}`}
            name="password"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            className={inputClass}
          />
        </FormField>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Guardando…" : staff ? "Guardar cambios" : "Agregar"}
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="text-sm text-muted hover:text-ink px-3 py-2"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

function StaffRow({ staff }: { staff: Staff }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="p-4">
        <StaffForm staff={staff} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="p-4 flex items-center justify-between gap-4">
      <div className="text-sm">
        <div
          className={`font-medium ${
            staff.active ? "text-ink" : "text-muted line-through"
          }`}
        >
          {staff.name}
        </div>
        <div className="text-muted">{staff.email}</div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-xs text-accent hover:underline"
        >
          Editar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              toggleStaffActiveAction(staff.id, !staff.active);
            })
          }
          className={`text-xs hover:underline disabled:opacity-50 ${
            staff.active ? "text-danger" : "text-success"
          }`}
        >
          {staff.active ? "Desactivar" : "Activar"}
        </button>
      </div>
    </div>
  );
}
