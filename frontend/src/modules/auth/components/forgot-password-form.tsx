"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { TextInput } from "@/components/ui/text-input";
import { useAuthForm } from "../hooks/use-auth-form";
import { forgotPasswordSchema, type ForgotPasswordFormValues } from "../schemas";
import { forgotPassword } from "../api/forgot-password";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);

  const { register, formRef, submitWithFocus, isSubmitting, errors } =
    useAuthForm(forgotPasswordSchema, async (data: ForgotPasswordFormValues) => {
      await forgotPassword(data.email);
      setSent(true);
    });

  if (sent) {
    return (
      <div className="flex flex-col gap-[var(--space-4)] text-center">
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]">
          If an account exists with that email, we&apos;ve sent a password reset link.
        </p>
        <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-secondary)]">
          Check your inbox (and spam folder). The link expires in 30 minutes.
        </p>
        <Link
          href="/sign-in"
          className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-link)] underline transition-colors hover:text-[var(--color-text-link-hover)]"
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={submitWithFocus}
      noValidate
      className="flex flex-col gap-[var(--space-4)]"
    >
      <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
        Enter your email and we&apos;ll send you a link to reset your password.
        This also works if you signed up with Google and want to add an email password.
      </p>

      <FormField label="Email" error={errors.email?.message} required>
        {(a11y) => (
          <TextInput
            {...a11y}
            {...register("email")}
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            spellCheck={false}
            error={!!errors.email}
            disabled={isSubmitting}
          />
        )}
      </FormField>

      {errors.root && (
        <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-error)] text-center" role="alert">
          {errors.root.message}
        </p>
      )}

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        className="w-full"
      >
        Send Reset Link
      </Button>
    </form>
  );
}
