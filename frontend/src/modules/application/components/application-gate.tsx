"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTenant } from "@/modules/tenant-shell";
import { useApplicationStatus } from "../hooks/use-application-status";

const PROTECTED_PREFIXES = [
  "/dashboard/materials",
  "/dashboard/milestones",
  "/dashboard/sales",
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

export function ApplicationGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { tenant } = useTenant();
  const { data, isLoading } = useApplicationStatus(tenant?.id);

  const status = data?.status;
  const needsRedirect =
    !isLoading && status !== "approved" && isProtectedRoute(pathname);

  useEffect(() => {
    if (needsRedirect) {
      router.replace("/dashboard/application");
    }
  }, [needsRedirect, router]);

  if (needsRedirect) return null;

  return <>{children}</>;
}
