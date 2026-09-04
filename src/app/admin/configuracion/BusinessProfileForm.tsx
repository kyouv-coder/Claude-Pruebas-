"use client";

import { useActionState } from "react";
import {
  updateBusinessProfileAction,
  uploadBusinessCoverImageAction,
  type ActionState,
} from "./actions";
import { FormField, FormError, FormSuccess, inputClass } from "@/components/FormField";

const initialState: ActionState = {};

export function BusinessProfileForm({
  description,
  address,
  hasCoverImage,
}: {
  description: string;
  address: string;
  hasCoverImage: boolean;
}) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateBusinessProfileAction,
    initialState
  );
  const [imageState, imageAction, imagePending] = useActionState(
    uploadBusinessCoverImageAction,
    initialState
  );

  return (
    <div className="flex flex-col gap-6 max-w-md">
      <form action={profileAction} className="flex flex-col gap-3" noValidate>
        <FormError message={profileState.error} />
        <FormSuccess message={profileState.success} />
        <FormField label="Descripción" htmlFor="bizDescription">
          <textarea
            id="bizDescription"
            name="description"
            defaultValue={description}
            rows={3}
            maxLength={800}
            placeholder="Contale al cliente qué ofrecés, en pocas líneas."
            className={inputClass}
          />
        </FormField>
        <FormField label="Dirección" htmlFor="bizAddress">
          <input id="bizAddress" name="address" defaultValue={address} className={inputClass} />
        </FormField>
        <button
          type="submit"
          disabled={profilePending}
          className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50 self-start"
        >
          {profilePending ? "Guardando…" : "Guardar"}
        </button>
      </form>

      <form action={imageAction} className="flex flex-col gap-2" noValidate>
        <FormError message={imageState.error} />
        <FormSuccess message={imageState.success} />
        {hasCoverImage && (
          // eslint-disable-next-line @next/next/no-img-element -- imagen servida por una API propia, no un dominio remoto configurable
          <img
            src="/admin/configuracion/imagen-negocio"
            alt="Foto de portada actual"
            className="w-full max-w-xs h-32 object-cover rounded-lg border border-border"
          />
        )}
        <FormField label={hasCoverImage ? "Reemplazar foto de portada" : "Foto de portada"} htmlFor="bizCover">
          <input
            id="bizCover"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="text-sm"
          />
        </FormField>
        <button
          type="submit"
          disabled={imagePending}
          className="text-sm text-accent hover:underline self-start disabled:opacity-50"
        >
          {imagePending ? "Subiendo…" : "Subir foto"}
        </button>
      </form>
    </div>
  );
}
