import { getCurrentUser } from "@/lib/auth";
import { PasswordForm } from "./PasswordForm";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Mi cuenta</h1>
        <p className="text-sm text-muted mt-1">
          Datos de acceso para {user?.business.name ?? "tu negocio"}.
        </p>
      </div>

      <section className="bg-surface border border-border rounded-lg p-5 max-w-md">
        <dl className="text-sm flex flex-col gap-2 mb-6">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Nombre</dt>
            <dd className="text-ink">{user?.name}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Email</dt>
            <dd className="text-ink">{user?.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Negocio</dt>
            <dd className="text-ink">{user?.business.name}</dd>
          </div>
        </dl>

        <h2 className="font-display text-lg text-ink mb-4">Cambiar contraseña</h2>
        <PasswordForm />
      </section>
    </div>
  );
}
