"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/reservas", label: "Reservas" },
  { href: "/admin/caja", label: "Caja" },
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/finanzas", label: "Finanzas" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export function AdminSidebar({
  operatorName,
  logoutAction,
}: {
  operatorName?: string;
  logoutAction: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="flex flex-wrap items-center md:flex-col md:items-stretch gap-1 md:gap-0.5 md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-border px-4 py-4 md:py-8"
    >
      <div className="hidden md:block mb-6 px-2">
        <span className="font-display text-lg text-ink">Spa</span>
        <p className="text-xs text-muted mt-0.5">Administración</p>
      </div>
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-accent-soft text-ink font-medium"
                : "text-muted hover:bg-accent-soft/60 hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
      <div className="md:mt-6 md:pt-4 md:border-t border-border">
        {operatorName && (
          <p className="hidden md:block text-xs text-muted px-3 mb-2">
            Conectada como {operatorName}
          </p>
        )}
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md px-3 py-2 text-sm text-muted hover:bg-accent-soft/60 hover:text-ink"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </nav>
  );
}
