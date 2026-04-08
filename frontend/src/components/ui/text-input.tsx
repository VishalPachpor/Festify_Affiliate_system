"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const baseClass = [
  "h-[var(--size-input)] w-full rounded-[var(--radius)]",
  "border bg-[var(--color-input)] px-[var(--space-4)]",
  "font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]",
  "placeholder:text-[var(--color-text-muted)]",
  "transition-colors duration-[var(--duration-normal)]",
  "hover:border-[var(--color-border-hover)]",
  "focus-visible:border-[var(--color-ring)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ring)]",
  "disabled:opacity-50 disabled:cursor-not-allowed",
].join(" ");

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          baseClass,
          error
            ? "border-[var(--color-error)] focus-visible:ring-[var(--color-error)]"
            : "border-[var(--color-border)]",
          className,
        )}
        {...props}
      />
    );
  },
);

TextInput.displayName = "TextInput";
