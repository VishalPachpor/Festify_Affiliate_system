import { cn } from "@/lib/utils";

type StatusVariant = "submitted" | "rejected";

const STATUS_COPY: Record<
  StatusVariant,
  { title: string; body: string; circleClass: string; iconClass: string }
> = {
  submitted: {
    title: "Application Submitted!",
    body: "Thank you for your interest in becoming a TOKEN2049 affiliate. We'll review your application and get back to you within 2-3 business days.",
    circleClass: "bg-[rgba(52,168,83,0.22)]",
    iconClass: "text-[var(--color-success)]",
  },
  rejected: {
    title: "Application Not Approved",
    body: "Thank you for your interest in the TOKEN2049 Affiliate Program. After reviewing your application, we're unable to move forward at this time.",
    circleClass: "bg-[rgba(239,68,68,0.22)]",
    iconClass: "text-[var(--color-error)]",
  },
};

function CheckIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4.2 4.2L19 6.5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function ApplicationStatusCard({ variant }: { variant: StatusVariant }) {
  const copy = STATUS_COPY[variant];
  const Icon = variant === "submitted" ? CheckIcon : CrossIcon;

  return (
    <section className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-8)] py-[calc(var(--space-8)+var(--space-2))] text-center shadow-[var(--shadow-card)]">
      <div
        className={cn(
          "mx-auto flex size-[5.25rem] items-center justify-center rounded-full",
          copy.circleClass,
        )}
      >
        <span className={copy.iconClass}>
          <Icon />
        </span>
      </div>

      <h2 className="mt-[var(--space-8)] font-[var(--font-display)] text-[3rem] font-bold leading-[1.08] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
        {copy.title}
      </h2>

      <p className="mx-auto mt-[var(--space-6)] max-w-[39rem] font-[var(--font-sans)] text-[1.15rem] leading-[1.7] text-[var(--color-text-primary)]/85">
        {copy.body}
      </p>
    </section>
  );
}
