"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { TextInput } from "@/components/ui/text-input";
import { PasswordInput } from "@/components/ui/password-input";
import { ApiError } from "@/services/api/client";
import { useAuthForm } from "../hooks/use-auth-form";
import { useSignupMutation } from "../hooks/use-signup";
import { signUpSchema, type SignUpFormValues } from "../schemas";

export function AuthSignUpForm() {
  const mutation = useSignupMutation();
  const [googleAccountError, setGoogleAccountError] = useState(false);

  const { register, formRef, submitWithFocus, isSubmitting, errors } =
    useAuthForm(signUpSchema, async (data: SignUpFormValues) => {
      setGoogleAccountError(false);
      try {
        await mutation.mutateAsync(data);
      } catch (err) {
        if (err instanceof ApiError && err.code === "GOOGLE_ACCOUNT_EXISTS") {
          setGoogleAccountError(true);
        }
        throw err;
      }
    });

  return (
    <form
      ref={formRef}
      onSubmit={submitWithFocus}
      noValidate
      className="flex flex-col gap-[0.8rem]"
    >
      <FormField label="Full Name" labelCase="normal" error={errors.fullName?.message} required>
        {(a11y) => (
          <TextInput
            {...a11y}
            {...register("fullName")}
            placeholder="Your name"
            autoComplete="name"
            error={!!errors.fullName}
            disabled={isSubmitting}
          />
        )}
      </FormField>

      <FormField label="Email" labelCase="normal" error={errors.email?.message} required>
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

      <FormField label="Password" labelCase="normal" error={errors.password?.message} required>
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

      <FormField label="Confirm Password" labelCase="normal" error={errors.confirmPassword?.message} required>
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

      {googleAccountError ? (
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-4)] py-[var(--space-3)] text-center">
          <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-secondary)]">
            This email is already registered with Google. Use the{" "}
            <strong className="text-[var(--color-text-primary)]">Continue with Google</strong>{" "}
            button above, or{" "}
            <Link
              href="/reset-password"
              className="text-[var(--color-text-link)] underline hover:text-[var(--color-text-link-hover)]"
            >
              set a password
            </Link>{" "}
            to enable email login.
          </p>
        </div>
      ) : errors.root ? (
        <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-error)] text-center" role="alert">
          {errors.root.message}
        </p>
      ) : null}

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        className="w-full"
      >
        Sign up
      </Button>
    </form>
  );
}
