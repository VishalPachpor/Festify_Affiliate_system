import type { Metadata } from "next";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { ApplicationGate } from "@/modules/application/components/application-gate";

export const metadata: Metadata = {
  title: "Dashboard — Festify Affiliates",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader />
        <main className="flex-1 overflow-y-auto">
          <ApplicationGate>{children}</ApplicationGate>
        </main>
      </div>
    </div>
  );
}
