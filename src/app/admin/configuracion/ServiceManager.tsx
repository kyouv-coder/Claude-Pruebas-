"use client";

import { useState, useTransition, useActionState } from "react";
import {
  createServiceAction,
  updateServiceAction,
  toggleServiceActiveAction,
  type ActionState,
} from "./actions";
import { FormField, FormError, FormSuccess, inputClass } from "@/components/FormField";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  active: boolean;
};

const initialState: ActionState = {};

function money(n: number) {
  return n.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

export function ServiceManager({ services }: { services: Service[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface border border-border rounded-lg p-5 max-w-md">
        <h3 className="text-sm font-medium text-ink mb-3">Nuevo servicio</h3>
        <ServiceForm />
      </div>
      <div className="bg-surface border border-border rounded-lg divide-y divide-border">
        {services.length === 0 && (
          <p className="text-sm text-muted p-4">
            Todavía no hay servicios cargados.
          </p>
        )}
        {services.map((s) => (
          <ServiceRow key={s.id} service={s} />
        ))}
      </div>
    </div>
  );
}

function ServiceForm({
  service,
  onDone,
}: {
  service?: Service;
  onDone?: () => void;
}) {
  const action = service ? updateServiceAction : createServiceAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const idSuffix = service?.id ?? "new";

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      {service && <input type="hidden" name="id" value={service.id} />}
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <FormField label="Nombre" htmlFor={`svc-name-${idSuffix}`} required>
        <input
          id={`svc-name-${idSuffix}`}
          name="name"
          defaultValue={service?.name}
          required
          className={inputClass}
        />
      </FormField>
      <FormField label="Descripción" htmlFor={`svc-desc-${idSuffix}`}>
        <textarea
          id={`svc-desc-${idSuffix}`}
          name="description"
          defaultValue={service?.description ?? ""}
          rows={2}
          className={inputClass}
        />
      </FormField>
      <div className="flex gap-2">
        <FormField label="Duración (min)" htmlFor={`svc-dur-${idSuffix}`} required>
          <input
            id={`svc-dur-${idSuffix}`}
            name="durationMinutes"
            type="number"
            min="1"
            step="1"
            defaultValue={service?.durationMinutes}
            required
            className={inputClass}
          />
        </FormField>
        <FormField label="Precio" htmlFor={`svc-price-${idSuffix}`} required>
          <input
            id={`svc-price-${idSuffix}`}
            name="price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={service?.price}
            required
            className={inputClass}
          />
        </FormField>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Guardando…" : service ? "Guardar cambios" : "Crear servicio"}
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

function ServiceRow({ service }: { service: Service }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <div className="p-4">
        <ServiceForm service={service} onDone={() => setEditing(false)} />
      </div>
    );
  }

  return (
    <div className="p-4 flex items-center justify-between gap-4">
      <div className="text-sm">
        <div
          className={`font-medium ${
            service.active ? "text-ink" : "text-muted line-through"
          }`}
        >
          {service.name}
        </div>
        <div className="text-muted">
          {service.durationMinutes} min · {money(service.price)}
        </div>
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
              toggleServiceActiveAction(service.id, !service.active);
            })
          }
          className={`text-xs hover:underline disabled:opacity-50 ${
            service.active ? "text-danger" : "text-success"
          }`}
        >
          {service.active ? "Desactivar" : "Activar"}
        </button>
      </div>
    </div>
  );
}
