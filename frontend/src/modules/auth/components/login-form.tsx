"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { TextInput } from "@/components/ui/text-input";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuthForm } from "../hooks/use-auth-form";
import { useLoginMutation } from "../hooks/use-login";
import { loginSchema, type LoginFormValues } from "../schemas";

export function LoginForm() {
  const mutation = useLoginMutation();

  const { register, formRef, submitWithFocus, isSubmitting, errors } =
    useAuthForm(loginSchema, async (data: LoginFormValues) => {
      await mutation.mutateAsync(data);
    });

  return (
    <form
      ref={formRef}
      onSubmit={submitWithFocus}
      noValidate
      className="flex flex-col gap-[var(--space-4)]"
    >
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

      <FormField
        label="Password"
        error={errors.password?.message}
        required
        trailing={
          <Link
            href="/reset-password"
            className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-link)] underline transition-colors hover:text-[var(--color-text-link-hover)]"
          >
            Forgot password?
          </Link>
        }
      >
        {(a11y) => (
          <PasswordInput
            {...a11y}
            {...register("password")}
            placeholder="••••••••"
            autoComplete="current-password"
            error={!!errors.password}
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
        Log In
      </Button>
    </form>
  );
}
