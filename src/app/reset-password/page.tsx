import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Restablecer contraseña · Sistema de gestión",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token || "";

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-lg p-6">
        <h1 className="font-display text-2xl text-ink mb-1">Restablecer contraseña</h1>
        {token ? (
          <>
            <p className="text-sm text-muted mb-6">Elegí tu nueva contraseña.</p>
            <ResetPasswordForm token={token} />
          </>
        ) : (
          <p className="text-sm text-danger mb-6">
            Este link no es válido. Pedí uno nuevo desde{" "}
            <Link href="/forgot-password" className="text-accent hover:underline">
              recuperar contraseña
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
