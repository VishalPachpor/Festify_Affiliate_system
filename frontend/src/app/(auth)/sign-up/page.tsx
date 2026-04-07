import type { Metadata } from "next";
import { AuthCard } from "@/modules/auth/components/auth-card";

export const metadata: Metadata = {
  title: "Sign Up — Festify Affiliates",
  description: "Create your Festify Affiliates account",
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-[var(--space-md)]">
      <AuthCard />
    </main>
  );
}
