import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Recuperar contraseña · Sistema de gestión",
};

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-lg p-6">
        <h1 className="font-display text-2xl text-ink mb-1">Recuperar contraseña</h1>
        <p className="text-sm text-muted mb-6">
          Ingresá tu email y te mandamos un link para elegir una nueva contraseña.
        </p>
        <ForgotPasswordForm />
        <p className="text-sm text-muted mt-4">
          <Link href="/login" className="text-accent hover:underline">
            Volver a ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}
