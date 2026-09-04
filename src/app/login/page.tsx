import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-lg p-6">
        <h1 className="font-display text-2xl text-ink mb-1">Spa</h1>
        <p className="text-sm text-muted mb-6">
          Ingresá para administrar el negocio.
        </p>
        <LoginForm next={params.next} />
      </div>
    </div>
  );
}
