import type { Metadata } from "next";
import { AuthCard } from "@/modules/auth/components/auth-card";
import { LoginForm } from "@/modules/auth/components/login-form";

export const metadata: Metadata = {
  title: "Log In — Passtrack Marketing Partners",
  description: "Log in to your Passtrack Marketing Partners account",
};

export default function SignInPage() {
  return (
    <AuthCard
      title="Log In"
      subtitle="Sign in to your Passtrack account."
      footerText="Don't have an account?"
      footerLinkText="Sign up"
      footerLinkHref="/sign-up"
      googleMode="login"
      hideRequiredHint
    >
      <LoginForm />
    </AuthCard>
  );
}
