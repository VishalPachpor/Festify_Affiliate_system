import type { Metadata } from "next";
import { AuthCard } from "@/modules/auth/components/auth-card";
import { AuthSignUpForm } from "@/modules/auth/components/auth-form";

export const metadata: Metadata = {
  title: "Sign Up — Festify Affiliates",
  description: "Create your Festify Affiliates account",
};

export default function SignUpPage() {
  return (
    <AuthCard
      title="Join as an Affiliate"
      subtitle="Create your affiliate account to start promoting events and earning commissions."
      footerText="Already have an account?"
      footerLinkText="Log in"
      footerLinkHref="/sign-in"
      googleMode="affiliate_signup"
    >
      <AuthSignUpForm />
    </AuthCard>
  );
}
