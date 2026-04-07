import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2",
    "rounded-[var(--radius-md)] font-medium",
    "transition-all duration-[var(--duration-normal)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2",
    "disabled:opacity-50 disabled:pointer-events-none",
    "active:brightness-95",
  ],
  {
    variants: {
      variant: {
        primary: [
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
          "hover:bg-[var(--color-primary-hover)]",
        ],
        secondary: [
          "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]",
          "hover:bg-[var(--color-surface-sunken)]",
        ],
        ghost: [
          "bg-transparent text-[var(--color-text-secondary)]",
          "hover:bg-[var(--color-secondary)] hover:text-[var(--color-text)]",
        ],
        danger: [
          "bg-[var(--color-error)] text-white",
          "hover:brightness-110",
        ],
      },
      size: {
        sm: "h-8 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    asChild?: boolean;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading,
      disabled,
      asChild = false,
      type,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        data-state={loading ? "loading" : "idle"}
        {...(!asChild && { type: type ?? "button" })}
        {...props}
      >
        {loading && (
          <span
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden="true"
          >
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          </span>
        )}
        <span className={cn(loading && "opacity-0")}>{children}</span>
      </Comp>
    );
  },
);

Button.displayName = "Button";

export { buttonVariants };
