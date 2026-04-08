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
  children,
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={cn("flex flex-col gap-[var(--space-2)]", className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-label)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--color-text-primary)]"
        >
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
