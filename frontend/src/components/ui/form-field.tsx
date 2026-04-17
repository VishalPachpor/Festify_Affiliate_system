"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FormFieldProps = {
  label: string;
  /** Inline helper text rendered below the input. Prefer this over a
   *  sibling info card — it keeps the grid rhythm clean and ties the
   *  message to the field it describes. */
  hint?: string;
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
  hint,
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
  const hintId = `${id}-hint`;

  // Reserve 2 lines of height on uppercase labels so that in a 2-col grid,
  // long labels ("CONTACT PERSON EMAIL ADDRESS") wrapping to two lines don't
  // push their input down past a single-line neighbor. Inputs then align
  // across the row regardless of label length.
  const labelClass =
    labelCase === "normal"
      ? "font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.3] font-medium text-[var(--color-text-primary)]"
      : "flex items-start min-h-[calc(var(--leading-label)*2)] font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-label)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--color-text-primary)]";

  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;

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
        "aria-describedby": describedBy,
        disabled: disabled || undefined,
      })}
      {hint && !error && (
        <p
          id={hintId}
          className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[1.5] text-[rgba(255,255,255,0.55)]"
        >
          {hint}
        </p>
      )}
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
