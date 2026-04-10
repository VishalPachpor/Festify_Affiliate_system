import type { Metadata } from "next";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { RouteGuard } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Admin — Festify Affiliates",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard requiredRole="admin">
      <div className="flex h-screen overflow-hidden">
        <AdminSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </RouteGuard>
  );
}
