import { AdminSidebar } from "@/components/AdminSidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 px-6 py-8 max-w-6xl">{children}</main>
    </div>
  );
}
