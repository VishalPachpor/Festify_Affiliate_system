"use client";

import { type ReactNode } from "react";
import { QueryProvider } from "./query-provider";
import { ThemeProvider, type TenantBranding } from "./theme-provider";

type AppProvidersProps = {
  branding?: TenantBranding;
  children: ReactNode;
};

export function AppProviders({ branding, children }: AppProvidersProps) {
  return (
    <QueryProvider>
      <ThemeProvider branding={branding}>{children}</ThemeProvider>
    </QueryProvider>
  );
}
