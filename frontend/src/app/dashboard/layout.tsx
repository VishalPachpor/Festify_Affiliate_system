import type { Metadata } from "next";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { ApplicationGate } from "@/modules/application/components/application-gate";
import { AffiliateProvider } from "@/modules/affiliate-shell";
import { RouteGuard } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Dashboard — Passtrack Marketing Partners",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Layered gates, outermost first:
  //   1. RouteGuard       — bounce unauthenticated visitors to /sign-in
  //   2. AffiliateProvider — supply affiliateId from JWT to scoped queries
  //   3. ApplicationGate   — bounce un-approved affiliates to the apply form
  return (
    <RouteGuard requiredRole="affiliate">
      <AffiliateProvider>
        <div className="relative flex h-screen overflow-hidden">
          {/* Ambient backdrop — same two-orb treatment used on the admin
              shell. Gives the whole dashboard (header + content) a cohesive
              atmosphere instead of a glow limited to the form container. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 18% 15%, rgba(59,130,246,0.12), transparent 42%)," +
                "radial-gradient(ellipse at 82% 85%, rgba(139,92,246,0.10), transparent 52%)",
            }}
          />
          <AppSidebar />
          <div className="relative flex flex-1 flex-col overflow-hidden">
            <AppHeader />
            <main className="flex-1 overflow-y-auto">
              <ApplicationGate>{children}</ApplicationGate>
            </main>
          </div>
        </div>
      </AffiliateProvider>
    </RouteGuard>
  );
}
