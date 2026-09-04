import Link from "next/link";
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
        <h1 className="font-display text-2xl text-ink mb-1">Ingresar</h1>
        <p className="text-sm text-muted mb-6">
          Entrá para administrar tu negocio.
        </p>
        <LoginForm next={params.next} />
        <p className="text-sm text-muted mt-4">
          ¿No tenés cuenta todavía?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Creá tu negocio acá
          </Link>
        </p>
      </div>
    </div>
  );
}
