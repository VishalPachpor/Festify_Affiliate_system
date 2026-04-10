import type { Metadata } from "next";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { ApplicationGate } from "@/modules/application/components/application-gate";
import { AffiliateProvider } from "@/modules/affiliate-shell";
import { RouteGuard } from "@/modules/auth";

export const metadata: Metadata = {
  title: "Dashboard — Festify Affiliates",
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
        <div className="flex h-screen overflow-hidden">
          <AppSidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
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
