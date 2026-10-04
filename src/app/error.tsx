"use client";

import Link from "next/link";

// Error boundary global: sin este archivo, cualquier error no atrapado en
// un server component o layout (no una server action — esas ya devuelven
// { error } y se muestran con FormError) mostraba la página genérica de
// Next ("Application error: a client-side exception has occurred"), sin
// ninguna salida para la usuaria más que recargar a mano.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-2xl text-ink mb-2">
          Algo salió mal
        </h1>
        <p className="text-sm text-muted mb-6">
          No pudimos mostrar esta página. Podés intentar de nuevo o volver al
          inicio.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="bg-ink text-paper rounded-md px-3 py-2 text-sm font-medium hover:opacity-90"
          >
            Intentar de nuevo
          </button>
          <Link href="/" className="text-accent hover:underline">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
