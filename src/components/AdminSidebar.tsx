"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/reservas", label: "Reservas" },
  { href: "/admin/caja", label: "Caja" },
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="flex md:flex-col gap-1 md:gap-0.5 md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-border px-4 py-4 md:py-8"
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
    </nav>
  );
}
