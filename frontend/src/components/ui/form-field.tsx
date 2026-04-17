"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FormFieldProps = {
  label: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  trailing?: ReactNode;
  className?: string;
  /** 'upper' (default) = SaaS table-style caption labels.
   *  'normal' = conversational Sentence case for marketing/onboarding surfaces. */
  labelCase?: "upper" | "normal";
  children: (props: {
    id: string;
    "aria-invalid": boolean | undefined;
    "aria-describedby": string | undefined;
    disabled: boolean | undefined;
  }) => ReactNode;
};

export function FormField({
  label,
  error,
  required,
  disabled,
  trailing,
  className,
  labelCase = "upper",
  children,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  const labelClass =
    labelCase === "normal"
      ? "font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.3] font-medium text-[var(--color-text-primary)]"
      : "font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-label)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--color-text-primary)]";

  return (
    <div className={cn("flex flex-col gap-[var(--space-2)]", className)}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={labelClass}>
          {label}
          {required && (
            <span className="ml-[var(--space-1)] text-[var(--color-error)]" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {trailing}
      </div>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
        disabled: disabled || undefined,
      })}
      {error && (
        <p
          id={errorId}
          className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-error)]"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </p>
      )}
    </div>
  );
}
