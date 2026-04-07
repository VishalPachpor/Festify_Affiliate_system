import { forwardRef, type HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ── Root ─────────────────────────────────────────────────

const cardVariants = cva(
  [
    "rounded-[var(--radius-lg)] border border-[var(--color-border)]",
    "bg-[var(--color-surface)] text-[var(--color-text)]",
  ],
  {
    variants: {
      variant: {
        default: "shadow-[var(--shadow-sm)]",
        elevated: "shadow-[var(--shadow-md)]",
      },
      padding: {
        default: "p-6",
        compact: "p-4",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  },
);

export type CardRootProps = HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof cardVariants>;

const CardRoot = forwardRef<HTMLDivElement, CardRootProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      data-variant={variant ?? "default"}
      className={cn(cardVariants({ variant, padding }), className)}
      {...props}
    />
  ),
);

CardRoot.displayName = "Card";

// ── Header ───────────────────────────────────────────────

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-header"
      className={cn(
        "flex items-center justify-between gap-[var(--space-md)]",
        className,
      )}
      {...props}
    />
  ),
);

CardHeader.displayName = "CardHeader";

// ── Title ────────────────────────────────────────────────

export type CardTitleProps = HTMLAttributes<HTMLHeadingElement>;

const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      data-slot="card-title"
      className={cn(
        "text-lg font-semibold tracking-tight text-[var(--color-text)]",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  ),
);

CardTitle.displayName = "CardTitle";

// ── Description ──────────────────────────────────────────

export type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      data-slot="card-description"
      className={cn(
        "text-sm text-[var(--color-text-secondary)]",
        className,
      )}
      {...props}
    />
  ),
);

CardDescription.displayName = "CardDescription";

// ── Content ──────────────────────────────────────────────

export type CardContentProps = HTMLAttributes<HTMLDivElement>;

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-content"
      className={cn("pt-[var(--space-md)]", className)}
      {...props}
    />
  ),
);

CardContent.displayName = "CardContent";

// ── Footer ───────────────────────────────────────────────

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card-footer"
      className={cn(
        "flex items-center gap-[var(--space-sm)] pt-[var(--space-md)]",
        className,
      )}
      {...props}
    />
  ),
);

CardFooter.displayName = "CardFooter";

// ── Compound export ──────────────────────────────────────

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Title: CardTitle,
  Description: CardDescription,
  Content: CardContent,
  Footer: CardFooter,
});

export { cardVariants };
