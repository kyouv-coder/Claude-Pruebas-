import Link from "next/link";

export const metadata = { title: "Términos de Servicio" };

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-paper px-4 py-12">
      <div className="max-w-2xl mx-auto bg-surface border border-border rounded-lg p-8">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Volver
        </Link>
        <h1 className="font-display text-2xl text-ink mt-4 mb-1">Términos de Servicio</h1>
        <p className="text-sm text-muted mb-6">Última actualización: {new Date().toLocaleDateString("es-AR")}</p>

        <div className="flex flex-col gap-4 text-sm text-ink leading-relaxed">
          <p>
            Al crear una cuenta en esta herramienta, aceptás estos términos. Si
            no estás de acuerdo, no la uses.
          </p>

          <h2 className="font-display text-lg text-ink mt-2">Qué es este servicio</h2>
          <p>
            Una herramienta de gestión (reservas, caja, clientes, giftcards y
            finanzas) para que un negocio administre su operación diaria. No es
            un sistema de facturación electrónica ni reemplaza tus obligaciones
            fiscales — hoy no emite comprobantes fiscales.
          </p>

          <h2 className="font-display text-lg text-ink mt-2">Tu responsabilidad</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Mantener tu contraseña segura y no compartirla.</li>
            <li>Los datos que cargues (clientes, precios, gastos) son tu responsabilidad — la herramienta solo los almacena y calcula sobre ellos.</li>
            <li>Cumplir con la normativa fiscal y de protección de datos que te aplique en tu jurisdicción.</li>
          </ul>

          <h2 className="font-display text-lg text-ink mt-2">Disponibilidad</h2>
          <p>
            Esta es una herramienta en desarrollo activo. Hacemos lo posible por
            mantenerla disponible y tus datos seguros, pero no garantizamos
            disponibilidad ininterrumpida. Te recomendamos exportar tus reportes
            periódicamente (CSV disponible en Finanzas y Caja) como respaldo
            propio.
          </p>

          <h2 className="font-display text-lg text-ink mt-2">Cambios</h2>
          <p>
            Podemos actualizar estos términos a medida que el producto
            evolucione. Te vamos a avisar de cambios importantes.
          </p>

          <p className="mt-4">
            Ver también la{" "}
            <Link href="/privacidad" className="text-accent hover:underline">
              Política de Privacidad
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
