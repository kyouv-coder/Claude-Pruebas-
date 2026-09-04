"use client";

import { useTransition } from "react";
import { markNoShowAction } from "./actions";

export function MarkNoShowButton({ bookingId }: { bookingId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => markNoShowAction(bookingId))}
      className="text-xs text-muted hover:underline disabled:opacity-50"
    >
      {pending ? "Marcando…" : "No se presentó"}
    </button>
  );
}
