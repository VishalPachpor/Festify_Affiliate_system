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
      <div className="relative flex h-screen overflow-hidden">
        {/* Ambient backdrop — same two-orb treatment used on the content
            canvas, applied at the shell level so the glow bleeds behind
            the header strip too. Sidebar stays opaque so it still reads
            as a surface; the tint is visible in the header and main pane. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 18% 15%, rgba(59,130,246,0.12), transparent 42%)," +
              "radial-gradient(ellipse at 82% 85%, rgba(139,92,246,0.10), transparent 52%)",
          }}
        />
        <AdminSidebar />
        <div className="relative flex flex-1 flex-col overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </RouteGuard>
  );
}
