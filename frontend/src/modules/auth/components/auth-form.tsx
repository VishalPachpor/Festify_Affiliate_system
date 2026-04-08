"use client";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { TextInput } from "@/components/ui/text-input";
import { PasswordInput } from "@/components/ui/password-input";
import { useAuthForm } from "../hooks/use-auth-form";
import { useSignupMutation } from "../hooks/use-signup";
import { signUpSchema, type SignUpFormValues } from "../schemas";

export function AuthSignUpForm() {
  const mutation = useSignupMutation();

  const { register, formRef, submitWithFocus, isSubmitting, errors } =
    useAuthForm(signUpSchema, async (data: SignUpFormValues) => {
      await mutation.mutateAsync(data);
    });

  return (
    <form
      ref={formRef}
      onSubmit={submitWithFocus}
      noValidate
      className="flex flex-col gap-[0.8rem]"
    >
      <FormField label="Full Name" error={errors.fullName?.message} required>
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

      <FormField label="Affiliate Email" error={errors.email?.message} required>
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

      <FormField label="Password" error={errors.password?.message} required>
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
        Sign up
      </Button>
    </form>
  );
}
