"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminSidebar({
  businessName,
  operatorName,
  isAdmin,
  bookingsNavLabel = "Reservas",
  clientsNavLabel = "Clientes",
  logoutAction,
}: {
  businessName?: string;
  operatorName?: string;
  isAdmin?: boolean;
  bookingsNavLabel?: string;
  clientsNavLabel?: string;
  logoutAction: () => void;
}) {
  const pathname = usePathname();
  const links = [
    { href: "/admin/reservas", label: bookingsNavLabel, adminOnly: false },
    { href: "/admin/caja", label: "Caja", adminOnly: false },
    { href: "/admin/clientes", label: clientsNavLabel, adminOnly: false },
    { href: "/admin/giftcards", label: "Giftcards", adminOnly: false },
    { href: "/admin/dashboard", label: "Dashboard", adminOnly: true },
    { href: "/admin/recomendaciones", label: "Recomendaciones", adminOnly: true },
    { href: "/admin/finanzas", label: "Finanzas", adminOnly: true },
    { href: "/admin/configuracion", label: "Configuración", adminOnly: true },
  ];
  const visibleLinks = links.filter((link) => !link.adminOnly || isAdmin);

  return (
    <nav
      aria-label="Navegación principal"
      className="flex flex-wrap items-center md:flex-col md:items-stretch gap-1 md:gap-0.5 md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-border px-4 py-4 md:py-8"
    >
      <div className="hidden md:block mb-6 px-2">
        <span className="font-display text-lg text-ink">
          {businessName ?? "Administración"}
        </span>
        <p className="text-xs text-muted mt-0.5">Administración</p>
      </div>
      {visibleLinks.map((link) => {
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
        <Link
          href="/admin/cuenta"
          aria-current={pathname === "/admin/cuenta" ? "page" : undefined}
          className={`block rounded-md px-3 py-2 text-sm transition-colors ${
            pathname === "/admin/cuenta"
              ? "bg-accent-soft text-ink font-medium"
              : "text-muted hover:bg-accent-soft/60 hover:text-ink"
          }`}
        >
          Mi cuenta
        </Link>
        <Link
          href="/admin/soporte"
          aria-current={pathname === "/admin/soporte" ? "page" : undefined}
          className={`block rounded-md px-3 py-2 text-sm transition-colors ${
            pathname === "/admin/soporte"
              ? "bg-accent-soft text-ink font-medium"
              : "text-muted hover:bg-accent-soft/60 hover:text-ink"
          }`}
        >
          Soporte
        </Link>
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
