import { AdminSidebar } from "@/components/AdminSidebar";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "./actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-ink focus:text-paper focus:rounded-md focus:px-3 focus:py-2 focus:text-sm"
      >
        Saltar al contenido principal
      </a>
      <AdminSidebar
        businessName={user?.business.name}
        operatorName={user?.name}
        logoutAction={logoutAction}
      />
      <main id="main-content" tabIndex={-1} className="flex-1 px-6 py-8 max-w-6xl">
        {children}
      </main>
    </div>
  );
}
