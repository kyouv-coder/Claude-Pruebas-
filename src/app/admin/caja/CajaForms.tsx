"use client";

import { useActionState } from "react";
import {
  openCashSessionAction,
  closeCashSessionAction,
  sellGiftCardAction,
  redeemGiftCardAction,
  type ActionState,
} from "./actions";
import { FormField, FormError, FormSuccess, inputClass } from "@/components/FormField";

const initialState: ActionState = {};

export function OpenCashForm() {
  const [state, formAction, pending] = useActionState(
    openCashSessionAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
      <FormField label="Monto inicial" htmlFor="openingAmount" required>
        <input
          id="openingAmount"
          name="openingAmount"
          type="number"
          step="0.01"
          min="0"
          required
          className={inputClass}
        />
      </FormField>
      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Abriendo…" : "Abrir caja"}
      </button>
    </form>
  );
}

export function CloseCashForm({ sessionId }: { sessionId: string }) {
  const [state, formAction, pending] = useActionState(
    closeCashSessionAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-2 items-end">
      <input type="hidden" name="sessionId" value={sessionId} />
      <div className="flex items-center gap-2">
        <label htmlFor="closingAmount" className="sr-only">
          Monto de cierre
        </label>
        <input
          id="closingAmount"
          name="closingAmount"
          type="number"
          step="0.01"
          min="0"
          required
          placeholder="Monto de cierre"
          className={`${inputClass} w-40`}
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-danger text-white rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Cerrando…" : "Cerrar caja"}
        </button>
      </div>
      <FormError message={state.error} />
      <FormSuccess message={state.success} />
    </form>
  );
}

export function SellGiftCardForm({ cashSessionId }: { cashSessionId: string }) {
  const [state, formAction, pending] = useActionState(
    sellGiftCardAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="cashSessionId" value={cashSessionId} />
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <FormField label="Nombre del cliente" htmlFor="gcClientName" required>
        <input id="gcClientName" name="clientName" required className={inputClass} />
      </FormField>
      <FormField label="Teléfono" htmlFor="gcClientPhone">
        <input id="gcClientPhone" name="clientPhone" className={inputClass} />
      </FormField>
      <FormField label="Email" htmlFor="gcClientEmail">
        <input
          id="gcClientEmail"
          name="clientEmail"
          type="email"
          className={inputClass}
        />
      </FormField>
      <div className="flex gap-2">
        <FormField label="Monto" htmlFor="gcAmount" required>
          <input
            id="gcAmount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            required
            className={inputClass}
          />
        </FormField>
        <FormField label="Pago" htmlFor="gcPaymentMethod" required>
          <select
            id="gcPaymentMethod"
            name="paymentMethod"
            className={inputClass}
          >
            <option value="CASH">Efectivo</option>
            <option value="CARD">Tarjeta</option>
            <option value="TRANSFER">Transferencia</option>
          </select>
        </FormField>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Vendiendo…" : "Vender giftcard"}
      </button>
    </form>
  );
}

export function RedeemGiftCardForm({ cashSessionId }: { cashSessionId: string }) {
  const [state, formAction, pending] = useActionState(
    redeemGiftCardAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="cashSessionId" value={cashSessionId} />
      <FormError message={state.error} />
      <FormSuccess message={state.success} />

      <FormField label="Código de giftcard" htmlFor="redeemCode" required>
        <input
          id="redeemCode"
          name="code"
          required
          placeholder="GC-AB12CD"
          className={`${inputClass} uppercase`}
        />
      </FormField>
      <FormField label="Monto a canjear" htmlFor="redeemAmount" required>
        <input
          id="redeemAmount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          required
          className={inputClass}
        />
      </FormField>
      <button
        type="submit"
        disabled={pending}
        className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Canjeando…" : "Canjear"}
      </button>
    </form>
  );
}
