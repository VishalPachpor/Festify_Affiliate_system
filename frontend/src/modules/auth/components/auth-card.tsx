"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthHeader } from "./auth-header";
import { AuthSignUpForm } from "./auth-form";

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-[var(--space-md)]">
      <span className="h-px flex-1 bg-[var(--color-border)]" />
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <span className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function AuthCard() {
  return (
    <Card variant="elevated" className="w-full max-w-[400px]">
      <AuthHeader
        title="Create Account"
        subtitle="Get started with Festify Affiliates"
      />

      <Card.Content>
        <div className="flex flex-col gap-[var(--space-lg)]">
          <Button variant="secondary" size="lg" className="w-full">
            <GoogleIcon />
            Continue with Google
          </Button>

          <Divider label="or continue with email" />

          <AuthSignUpForm />
        </div>
      </Card.Content>

      <Card.Footer className="justify-center pt-[var(--space-lg)]">
        <p className="text-sm text-[var(--color-text-secondary)]">
          Already have an account?{" "}
          <Link
            href="/sign-in"
            className="font-medium text-[var(--color-primary)] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </Card.Footer>
    </Card>
  );
}
