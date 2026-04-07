"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useId,
  useMemo,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type HTMLAttributes,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ── Context ──────────────────────────────────────────────

type InputContextValue = {
  id: string;
  error?: boolean;
  disabled?: boolean;
  required?: boolean;
  size: "sm" | "md" | "lg";
};

const InputContext = createContext<InputContextValue | null>(null);

function useInputContext() {
  const ctx = useContext(InputContext);
  if (!ctx) {
    throw new Error("Input compound components must be used within <Input>");
  }
  return ctx;
}

// ── Field variants ───────────────────────────────────────

const inputFieldVariants = cva(
  [
    "w-full rounded-[var(--radius-md)] border px-3 text-sm",
    "bg-[var(--color-surface)] text-[var(--color-text)]",
    "placeholder:text-[var(--color-text-muted)]",
    "transition-colors duration-[var(--duration-normal)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:cursor-not-allowed",
  ],
  {
    variants: {
      size: {
        sm: "h-8 text-sm",
        md: "h-10 text-sm",
        lg: "h-12 text-base px-4",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

// ── Root ─────────────────────────────────────────────────

export type InputRootProps = HTMLAttributes<HTMLDivElement> & {
  error?: boolean;
  disabled?: boolean;
  required?: boolean;
  size?: "sm" | "md" | "lg";
};

function InputRoot({
  className,
  error,
  disabled,
  required,
  size = "md",
  children,
  ...props
}: InputRootProps) {
  const generatedId = useId();
  const ctx = useMemo(
    () => ({ id: generatedId, error, disabled, required, size }),
    [generatedId, error, disabled, required, size],
  );

  return (
    <InputContext.Provider value={ctx}>
      <div
        className={cn("flex flex-col gap-[var(--space-xs)]", className)}
        data-state={error ? "error" : "idle"}
        data-disabled={disabled ? "true" : undefined}
        {...props}
      >
        {children}
      </div>
    </InputContext.Provider>
  );
}

// ── Label ────────────────────────────────────────────────

export type InputLabelProps = LabelHTMLAttributes<HTMLLabelElement>;

function InputLabel({ className, children, ...props }: InputLabelProps) {
  const { id, required } = useInputContext();

  return (
    <label
      htmlFor={id}
      className={cn(
        "text-sm font-medium text-[var(--color-text)]",
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-0.5 text-[var(--color-error)]" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

// ── Field ────────────────────────────────────────────────

export type InputFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
>;

const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ className, disabled: fieldDisabled, ...props }, ref) => {
    const {
      id,
      error,
      disabled: rootDisabled,
      required,
      size,
    } = useInputContext();
    const isDisabled = fieldDisabled ?? rootDisabled;

    return (
      <input
        ref={ref}
        id={id}
        disabled={isDisabled}
        required={required}
        aria-invalid={error || undefined}
        aria-required={required || undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        data-state={error ? "error" : "idle"}
        className={cn(
          inputFieldVariants({ size }),
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

InputField.displayName = "InputField";

// ── Helper ───────────────────────────────────────────────

export type InputHelperProps = HTMLAttributes<HTMLParagraphElement>;

function InputHelper({ className, children, ...props }: InputHelperProps) {
  const { error } = useInputContext();
  if (error) return null;

  return (
    <p
      className={cn(
        "text-xs text-[var(--color-text-muted)]",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

// ── Error ────────────────────────────────────────────────

export type InputErrorProps = HTMLAttributes<HTMLParagraphElement>;

function InputError({ className, children, ...props }: InputErrorProps) {
  const { id, error } = useInputContext();
  if (!error || !children) return null;

  return (
    <p
      id={`${id}-error`}
      role="alert"
      aria-live="assertive"
      className={cn(
        "text-xs text-[var(--color-error)]",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
}

// ── Compound export ──────────────────────────────────────

export const Input = Object.assign(InputRoot, {
  Label: InputLabel,
  Field: InputField,
  Helper: InputHelper,
  Error: InputError,
});

export { inputFieldVariants };
