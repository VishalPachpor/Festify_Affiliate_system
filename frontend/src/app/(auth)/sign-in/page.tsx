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
      title="Affiliate Login"
      footerText="Not an affiliate yet?"
      footerLinkText="Sign up here"
      footerLinkHref="/sign-up"
    >
      <LoginForm />
    </AuthCard>
  );
}
