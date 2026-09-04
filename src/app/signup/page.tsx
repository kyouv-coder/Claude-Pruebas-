import Link from "next/link";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4 py-8">
      <div className="w-full max-w-sm bg-surface border border-border rounded-lg p-6">
        <h1 className="font-display text-2xl text-ink mb-1">Creá tu cuenta</h1>
        <p className="text-sm text-muted mb-6">
          Reservas, caja, giftcards y finanzas para tu negocio, con tus
          propios datos.
        </p>
        <SignupForm />
        <p className="text-sm text-muted mt-4">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Ingresá acá
          </Link>
        </p>
      </div>
    </div>
  );
}
