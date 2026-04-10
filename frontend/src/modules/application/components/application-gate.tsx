"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTenant } from "@/modules/tenant-shell";
import { useApplicationStatus } from "../hooks/use-application-status";

function isProtectedRoute(pathname: string): boolean {
  if (pathname === "/dashboard") {
    return true;
  }

  if (!pathname.startsWith("/dashboard/")) {
    return false;
  }

  return !pathname.startsWith("/dashboard/application");
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
