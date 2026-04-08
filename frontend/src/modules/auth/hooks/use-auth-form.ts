"use client";

import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type Path,
  type Resolver,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useRef } from "react";
import type { ZodType } from "zod";

/**
 * Generic auth form hook — wraps RHF + Zod + error focus.
 *
 * The `Resolver` cast is required because Zod v4's internal types
 * don't align with RHF's generic constraints. Validation is correct
 * at runtime — the cast only bridges the type mismatch.
 */
export function useAuthForm<TValues extends FieldValues>(
  schema: ZodType<TValues, unknown>,
  onSubmit: (data: TValues) => Promise<void>,
  defaults?: DefaultValues<TValues>,
) {
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<TValues>({
    resolver: zodResolver(schema as never) as Resolver<TValues>,
    defaultValues: defaults,
  });

  const { handleSubmit, setError, formState } = form;

  const submit = handleSubmit(async (data) => {
    try {
      await onSubmit(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError("root" as Path<TValues>, { message });
    }
  });

  const submitWithFocus = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      await submit(e);

      if (formRef.current && Object.keys(formState.errors).length > 0) {
        const firstError = formRef.current.querySelector<HTMLInputElement>(
          "[aria-invalid='true']",
        );
        firstError?.focus();
      }
    },
    [submit, formState.errors],
  );

  return {
    ...form,
    formRef,
    submitWithFocus,
    isSubmitting: formState.isSubmitting,
    errors: formState.errors,
  };
}
