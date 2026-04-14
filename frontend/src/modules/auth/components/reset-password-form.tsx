"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuthForm } from "../hooks/use-auth-form";
import { resetPasswordSchema, type ResetPasswordFormValues } from "../schemas";
import { resetPassword } from "../api/reset-password";
import { useAuth, destinationForRole } from "../provider";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loginDirect } = useAuth();
  const token = searchParams?.get("token");

  const { register, formRef, submitWithFocus, isSubmitting, errors } =
    useAuthForm(resetPasswordSchema, async (data: ResetPasswordFormValues) => {
      if (!token) throw new Error("Missing reset token");
      const { token: jwt, user } = await resetPassword(token, data.password);
      loginDirect(jwt, user);
      router.push(destinationForRole(user.role));
    });

  if (!token) {
    return (
      <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-error)] text-center">
        Invalid reset link. Please request a new password reset.
      </p>
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
        Enter your new password below.
      </p>

      <FormField label="New Password" error={errors.password?.message} required>
        {(a11y) => (
          <PasswordInput
            {...a11y}
            {...register("password")}
            placeholder="••••••••"
            autoComplete="new-password"
            error={!!errors.password}
            disabled={isSubmitting}
          />
        )}
      </FormField>

      <FormField label="Confirm Password" error={errors.confirmPassword?.message} required>
        {(a11y) => (
          <PasswordInput
            {...a11y}
            {...register("confirmPassword")}
            placeholder="••••••••"
            autoComplete="new-password"
            error={!!errors.confirmPassword}
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
        Set New Password
      </Button>
    </form>
  );
}
