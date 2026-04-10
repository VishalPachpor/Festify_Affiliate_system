import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Button — 3 variants from Figma
 *
 * primary (node 117:179): h=45px, px=32, bg=#1c4aa6, text=#f0f0f0, semibold
 * ghost   (auth):         h=38px, px=auto, bg=transparent, border=white/10, text=#dadada, medium
 * social  (node 117:156): h=auto (py=12), px=24, gap=16, bg=white, border=#d1d5dc, text=#1c1c1c, semibold, shadow
 */

const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center cursor-pointer",
    "rounded-[var(--radius)]",
    "font-[var(--font-sans)]",
    "transition-colors duration-[var(--duration-normal)]",
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-card)]",
  ],
  {
    variants: {
      variant: {
        primary: [
          "h-[var(--size-btn)] px-[var(--space-8)]",
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]",
          "text-[var(--text-sm)] leading-[var(--leading-snug)] font-semibold",
          "hover:bg-[var(--color-primary-hover)]",
          "active:brightness-95",
        ],
        ghost: [
          "h-[var(--size-tab)]",
          "bg-transparent border border-[var(--color-border-ghost)]",
          "text-[var(--text-sm)] leading-[var(--leading-tab)] font-medium",
          "text-[var(--color-text-inactive)]",
          "hover:bg-[var(--color-surface-ghost-hover)] hover:text-[var(--color-text-primary)]",
        ],
        social: [
          "w-full gap-[var(--space-4)] px-[var(--space-6)] py-[var(--space-3)]",
          "bg-[var(--color-surface-white)] border border-[var(--color-border-social)]",
          "text-[var(--text-sm)] leading-[var(--leading-snug)] font-semibold",
          "text-[var(--color-text-dark)]",
          "shadow-[var(--shadow-button)]",
          "hover:bg-[var(--color-surface-white-hover)]",
        ],
      },
    },
    defaultVariants: {
      variant: "primary",
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
        className={cn(buttonVariants({ variant }), className)}
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
            <span className="size-[var(--space-4)] animate-spin rounded-full border-2 border-current border-t-transparent" />
          </span>
        )}
        <span className={cn("inline-flex items-center justify-center gap-[inherit]", loading && "opacity-0")}>
          {children}
        </span>
      </Comp>
    );
  },
);

Button.displayName = "Button";

export { buttonVariants };
