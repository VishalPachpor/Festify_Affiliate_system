"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const baseClass = [
  "h-[var(--size-input)] w-full rounded-[var(--radius)]",
  "border bg-[var(--color-input)] px-[var(--space-4)]",
  "font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]",
  "placeholder:text-[var(--color-text-muted)]",
  "transition-[border-color,box-shadow,background-color] duration-[var(--duration-normal)]",
  "hover:border-[var(--color-border-hover)]",
  // Focus energy: the accent blue border lifts, plus a soft 3px glow ring.
  // Swapped focus-visible for focus so the glow is visible on mouse taps too.
  "focus:outline-none focus:border-[#5B8DEF] focus:shadow-[0_0_0_3px_rgba(91,141,239,0.22)] focus:bg-[rgba(255,255,255,0.04)]",
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
