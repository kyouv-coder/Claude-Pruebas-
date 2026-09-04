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
      <AdminSidebar
        businessName={user?.business.name}
        operatorName={user?.name}
        logoutAction={logoutAction}
      />
      <main className="flex-1 px-6 py-8 max-w-6xl">{children}</main>
    </div>
  );
}
