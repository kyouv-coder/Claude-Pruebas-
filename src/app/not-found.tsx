import Link from "next/link";

// Next muestra una página genérica sin estilo propio para cualquier
// notFound() (ej. /admin/clientes/[id] con un id inexistente, o
// /reservar/[slug] con un slug que no existe) a menos que exista este
// archivo — hasta ahora no había ninguno, así que ambos casos (y cualquier
// ruta inexistente) caían en el "404 | This page could not be found" por
// defecto de Next, fuera de la identidad visual del resto de la app.
export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm text-center">
        <h1 className="font-display text-2xl text-ink mb-2">
          No encontramos esta página
        </h1>
        <p className="text-sm text-muted mb-6">
          Puede que el enlace esté roto, o que lo que buscás ya no exista.
        </p>
        <Link href="/" className="text-accent hover:underline">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
