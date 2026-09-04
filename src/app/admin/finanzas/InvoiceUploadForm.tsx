"use client";

import { useActionState } from "react";
import { uploadSaleInvoiceAction, type ActionState } from "./actions";

const initialState: ActionState = {};

export function InvoiceUploadForm({
  saleId,
  hasInvoice,
}: {
  saleId: string;
  hasInvoice: boolean;
}) {
  const [state, formAction, pending] = useActionState(uploadSaleInvoiceAction, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2 text-xs">
      <input type="hidden" name="saleId" value={saleId} />
      {hasInvoice && (
        <a
          href={`/admin/finanzas/comprobante/${saleId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Ver comprobante
        </a>
      )}
      <label htmlFor={`invoice-${saleId}`} className="sr-only">
        {hasInvoice ? "Reemplazar comprobante" : "Subir comprobante"}
      </label>
      <input
        id={`invoice-${saleId}`}
        name="file"
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        className="text-xs max-w-[9rem]"
      />
      <button
        type="submit"
        disabled={pending}
        className="text-ink border border-border rounded-md px-2 py-1 hover:bg-accent-soft/60 disabled:opacity-50"
      >
        {pending ? "Subiendo…" : hasInvoice ? "Reemplazar" : "Subir"}
      </button>
      {state.error && (
        <span role="alert" className="text-danger">
          {state.error}
        </span>
      )}
    </form>
  );
}
