import Link from "next/link";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <nav className="border-b bg-white px-6 py-4 flex gap-6">
        <span className="font-semibold">Spa · Administración</span>
        <Link href="/admin/reservas" className="text-sm text-neutral-600 hover:text-black">
          Reservas
        </Link>
        <Link href="/admin/dashboard" className="text-sm text-neutral-600 hover:text-black">
          Dashboard
        </Link>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
