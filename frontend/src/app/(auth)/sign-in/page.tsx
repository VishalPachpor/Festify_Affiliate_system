import type { Metadata } from "next";
import { AuthCard } from "@/modules/auth/components/auth-card";
import { LoginForm } from "@/modules/auth/components/login-form";

export const metadata: Metadata = {
  title: "Log In — Festify Affiliates",
  description: "Log in to your Festify Affiliates account",
};

export default function SignInPage() {
  return (
    <AuthCard
      title="Log In"
      subtitle="Sign in as an organizer or affiliate."
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkHref="/sign-up"
      googleMode="login"
    >
      <LoginForm />
    </AuthCard>
  );
}
