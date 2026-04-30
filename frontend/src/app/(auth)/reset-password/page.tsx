import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/modules/auth/components/auth-card";
import { ResetPasswordClient } from "./client";

export const metadata: Metadata = {
  title: "Reset Password — Passtrack Marketing Partners",
};

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Reset Password"
      subtitle="Set a new password for your account."
      footerText="Remember your password?"
      footerLinkText="Log in"
      footerLinkHref="/sign-in"
      showGoogle={false}
      showTabs={false}
    >
      <Suspense>
        <ResetPasswordClient />
      </Suspense>
    </AuthCard>
  );
}
