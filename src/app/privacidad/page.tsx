import Link from "next/link";

export const metadata = { title: "Política de Privacidad" };

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-paper px-4 py-12">
      <div className="max-w-2xl mx-auto bg-surface border border-border rounded-lg p-8">
        <Link href="/" className="text-sm text-accent hover:underline">
          ← Volver
        </Link>
        <h1 className="font-display text-2xl text-ink mt-4 mb-1">Política de Privacidad</h1>
        <p className="text-sm text-muted mb-6">Última actualización: {new Date().toLocaleDateString("es-AR")}</p>

        <div className="flex flex-col gap-4 text-sm text-ink leading-relaxed">
          <p>
            Esta plataforma es una herramienta de gestión para pequeños y
            medianos negocios (reservas, caja, clientes y finanzas). Cada
            negocio que se registra administra sus propios datos, aislados de
            los de cualquier otro negocio en el sistema.
          </p>

          <h2 className="font-display text-lg text-ink mt-2">Qué datos guardamos</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Datos de la cuenta: nombre del negocio, nombre y email de quien administra, contraseña (guardada como hash, nunca en texto plano).</li>
            <li>Datos operativos que el negocio carga: reservas, clientes (nombre, teléfono, email, notas), ventas, giftcards, gastos y productos.</li>
            <li>Datos técnicos mínimos para seguridad: intentos de acceso fallidos, para prevenir ataques de fuerza bruta.</li>
          </ul>

          <h2 className="font-display text-lg text-ink mt-2">Cómo se usan</h2>
          <p>
            Los datos se usan exclusivamente para operar la herramienta: mostrar
            reservas, calcular métricas del negocio, y — si el negocio lo activa —
            enviar notificaciones a su propio canal de Slack. No se venden ni se
            comparten con terceros con fines comerciales.
          </p>

          <h2 className="font-display text-lg text-ink mt-2">Aislamiento entre negocios</h2>
          <p>
            Cada negocio tiene sus datos completamente separados de los demás a
            nivel de base de datos. Ninguna cuenta puede ver, editar ni eliminar
            información de otro negocio.
          </p>

          <h2 className="font-display text-lg text-ink mt-2">Tus derechos</h2>
          <p>
            Podés pedir la exportación o eliminación de tus datos contactando a
            quien te dio acceso a esta herramienta. Los reportes de reservas y
            gastos se pueden descargar en formato CSV desde Finanzas y Caja.
          </p>

          <h2 className="font-display text-lg text-ink mt-2">Contacto</h2>
          <p>
            Ante cualquier consulta sobre tus datos, contactá directamente a la
            persona responsable del negocio con el que te registraste.
          </p>
        </div>
      </div>
    </div>
  );
}
