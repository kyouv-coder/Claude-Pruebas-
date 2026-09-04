"use client";

import { useTransition } from "react";
import { cancelBookingAction } from "./actions";

export function CancelBookingButton({
  bookingId,
  clientName,
}: {
  bookingId: string;
  clientName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          window.confirm(`¿Cancelar la reserva de ${clientName}? Esta acción no se puede deshacer.`)
        ) {
          startTransition(() => {
            cancelBookingAction(bookingId);
          });
        }
      }}
      className="text-xs text-danger hover:underline disabled:opacity-50"
    >
      {pending ? "Cancelando…" : "Cancelar"}
    </button>
  );
}
