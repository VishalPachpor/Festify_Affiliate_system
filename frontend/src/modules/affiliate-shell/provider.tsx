"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useAuth } from "@/modules/auth";

// ─────────────────────────────────────────────────────────────────────────────
// Affiliate Shell
//
// Mirrors `tenant-shell`, but supplies the *current affiliate's* identity to
// the components rendered under it. Mounted ONLY under /dashboard/layout.tsx —
// the admin layout deliberately does NOT provide it, so any hook that calls
// `useAffiliateContext()` from /admin/* gets `affiliateId = null` and falls
// back to tenant-wide queries.
//
// Resolution order:
//   1. Logged-in user from AuthProvider → user.affiliateId (real auth)
//   2. NEXT_PUBLIC_AFFILIATE_ID env var (legacy dev mode without login)
//   3. null
// ─────────────────────────────────────────────────────────────────────────────

type AffiliateContextValue = {
  affiliateId: string | null;
};

const AffiliateCtx = createContext<AffiliateContextValue>({ affiliateId: null });

export function useAffiliateContext(): AffiliateContextValue {
  return useContext(AffiliateCtx);
}

export function AffiliateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const affiliateId =
    user?.affiliateId ?? process.env.NEXT_PUBLIC_AFFILIATE_ID ?? null;

  return (
    <AffiliateCtx.Provider value={{ affiliateId }}>{children}</AffiliateCtx.Provider>
  );
}
