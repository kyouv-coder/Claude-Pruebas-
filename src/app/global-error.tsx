"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen flex items-center justify-center bg-paper px-4">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-xl text-ink mb-2">Algo salió mal</h1>
          <p className="text-sm text-muted">
            Ya nos enteramos del error. Probá recargar la página en un
            momento.
          </p>
        </div>
      </body>
    </html>
  );
}
