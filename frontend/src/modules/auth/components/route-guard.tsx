"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, destinationForRole } from "../provider";
import type { UserRole } from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// RouteGuard
//
// Client-side gate for an entire layout subtree. Mounted inside admin/layout
// and dashboard/layout. Three responsibilities:
//
//   1. Block unauthenticated users → redirect to /sign-in?next=<currentPath>
//   2. Block users with the wrong role → redirect to their canonical home
//      (admin → /admin, affiliate → /dashboard) so they can't peek at the
//      other side's UI
//   3. Render nothing while loading or while a redirect is in flight, so
//      protected content never flashes on screen before the bounce
//
// JWT is in localStorage, not a cookie, so server middleware can't see it.
// Client-side guard is the right pattern for that storage choice.
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  requiredRole: UserRole;
  children: ReactNode;
};

export function RouteGuard({ requiredRole, children }: Props) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !user) {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/sign-in?next=${next}`);
      return;
    }

    if (user.role !== requiredRole) {
      router.replace(destinationForRole(user.role));
    }
  }, [status, user, requiredRole, router, pathname]);

  // Hide protected content while we don't yet know who the user is, or while
  // a redirect is queued. The brief blank state is preferable to a flash of
  // admin UI for an unauthenticated visitor.
  if (status !== "authenticated" || !user || user.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
