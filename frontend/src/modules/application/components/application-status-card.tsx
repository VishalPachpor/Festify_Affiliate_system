import { cn } from "@/lib/utils";
import Link from "next/link";

type StatusVariant = "submitted" | "mou_required" | "rejected";

const STATUS_COPY: Record<
  StatusVariant,
  { title: string; body: string; circleClass: string; iconClass: string }
> = {
  submitted: {
    title: "Application Submitted!",
    body: "Thank you for your interest in becoming a TOKEN2049 marketing partner. We'll review your application and get back to you within 2-3 business days.",
    circleClass: "bg-[rgba(52,168,83,0.22)]",
    iconClass: "text-[var(--color-success)]",
  },
  mou_required: {
    title: "MOU Signature Required",
    body: "Your application has been approved. Sign the marketing partner MOU to activate your account and unlock your dashboard.",
    circleClass: "bg-[rgba(59,130,246,0.22)]",
    iconClass: "text-[var(--color-primary)]",
  },
  rejected: {
    title: "Application Not Approved",
    body: "Thank you for your interest in the TOKEN2049 Marketing Partner Program. After reviewing your application, we're unable to move forward at this time.",
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

function DocumentIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
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
  const Icon = variant === "submitted"
    ? CheckIcon
    : variant === "mou_required"
      ? DocumentIcon
      : CrossIcon;

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

      <p className="mx-auto mt-[var(--space-6)] max-w-[39rem] font-[var(--font-sans)] text-[var(--text-lg)] leading-[1.7] text-[var(--color-text-primary)]/85">
        {copy.body}
      </p>

      {variant === "mou_required" && (
        <Link
          href="/dashboard/application/mou"
          className="mt-[var(--space-8)] inline-flex h-[44px] items-center justify-center rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-6)] font-[var(--font-sans)] text-[var(--text-sm)] font-semibold text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          Sign MOU
        </Link>
      )}
    </section>
  );
}
