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
      title="Create Account"
      subtitle="Join the affiliate program and earn 10% commission on every ticket sold."
      footerText="Already have an account?"
      footerLinkText="Log in"
      footerLinkHref="/sign-in"
    >
      <AuthSignUpForm />
    </AuthCard>
  );
}
