"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { TextInput } from "@/components/ui/text-input";
import {
  submitPublicApplication,
  type PublicApplicationResponse,
} from "../api/submit-public-application";

const textareaClass = [
  "min-h-[8.75rem] w-full rounded-[var(--radius)] border border-[var(--color-border)]",
  "bg-[var(--color-input)] px-[var(--space-4)] py-[var(--space-4)]",
  "font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]",
  "placeholder:text-[var(--color-text-muted)]",
  "transition-colors duration-[var(--duration-normal)]",
  "hover:border-[var(--color-border-hover)]",
  "focus-visible:border-[var(--color-ring)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ring)]",
  "resize-none",
].join(" ");

type Props = {
  eventSlug: string;
  eventName: string;
  organizerName: string;
  commissionRateBps: number;
};

export function PublicApplicationForm({ eventSlug, eventName, organizerName, commissionRateBps }: Props) {
  const [result, setResult] = useState<PublicApplicationResponse | null>(null);

  const mutation = useMutation({
    mutationFn: submitPublicApplication,
    onSuccess: (data) => setResult(data),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mutation.mutate({
      eventSlug,
      firstName: String(fd.get("firstName") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      socialProfiles: String(fd.get("socialProfiles") ?? "").trim() || undefined,
      audienceSize: String(fd.get("audienceSize") ?? "").trim() || undefined,
      experience: String(fd.get("experience") ?? "").trim() || undefined,
      fitReason: String(fd.get("fitReason") ?? "").trim(),
      requestedCode: String(fd.get("requestedCode") ?? "").trim().toUpperCase() || undefined,
    });
  }

  const commissionPct = (commissionRateBps / 100).toFixed(0);
  const errorMessage = mutation.error instanceof Error ? mutation.error.message : null;

  if (result) {
    return (
      <div className="relative z-10 mx-auto max-w-[44rem] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-7)] py-[var(--space-7)]">
        <h2 className="font-[var(--font-display)] text-[2rem] font-bold leading-[1.1] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
          {result.duplicate ? "You've already applied" : "Application received"}
        </h2>
        <p className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.6] text-[var(--color-text-secondary)]">
          {result.status === "approved"
            ? `You're approved for ${eventName}. Check your email for your referral link and dashboard access.`
            : result.status === "rejected"
              ? `Unfortunately your application for ${eventName} was not approved this time.`
              : `Thanks for applying to ${eventName}. The ${organizerName} team will review your application and get back to you by email.`}
        </p>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto max-w-[73rem]">
      <header>
        <p className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[var(--tracking-caption)] text-[var(--color-text-secondary)]">
          {organizerName} · Affiliate Program
        </p>
        <h1 className="mt-[var(--space-2)] font-[var(--font-display)] text-[3rem] font-bold leading-[1.08] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
          Become an Affiliate for {eventName}
        </h1>
        <p className="mt-[var(--space-3)] max-w-[44rem] font-[var(--font-sans)] text-[var(--text-lg)] leading-[1.6] text-[var(--color-text-secondary)]">
          Earn {commissionPct}% commission on every ticket sold through your referral link.
          Apply below — you'll hear back by email.
        </p>
        <p className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[var(--tracking-caption)] text-[var(--color-text-secondary)]">
          Required fields marked with *
        </p>
      </header>

      <form
        className="mt-[var(--space-8)] flex flex-col gap-[var(--space-5)]"
        onSubmit={handleSubmit}
      >
        <div className="grid gap-[var(--space-4)] lg:grid-cols-2">
          <FormField label="First Name">
            {(a11y) => (
              <TextInput
                {...a11y}
                name="firstName"
                placeholder="Your name"
                autoComplete="given-name"
                required
              />
            )}
          </FormField>

          <FormField label="Email">
            {(a11y) => (
              <TextInput
                {...a11y}
                name="email"
                type="email"
                placeholder="your@email.com"
                autoComplete="email"
                spellCheck={false}
                required
              />
            )}
          </FormField>

          <FormField label="Social Profiles">
            {(a11y) => (
              <TextInput
                {...a11y}
                name="socialProfiles"
                placeholder="Twitter, LinkedIn, etc."
              />
            )}
          </FormField>

          <FormField label="Audience Size">
            {(a11y) => (
              <TextInput
                {...a11y}
                name="audienceSize"
                placeholder="e.g., 10K Twitter, 5K newsletter"
              />
            )}
          </FormField>
        </div>

        <FormField label="Relevant Experience">
          {(a11y) => (
            <TextInput
              {...a11y}
              name="experience"
              placeholder="Past affiliate programs, event promotion, etc."
            />
          )}
        </FormField>

        <FormField label="Preferred Referral Code">
          {(a11y) => (
            <TextInput
              {...a11y}
              name="requestedCode"
              placeholder="e.g. VISHAL20"
              autoComplete="off"
              maxLength={20}
            />
          )}
        </FormField>
        <p className="-mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
          Alphanumeric, 4-20 characters. This is a request — the final code may be modified by the organizer.
        </p>

        <FormField label="Why Are You A Good Fit?" required>
          {(a11y) => (
            <textarea
              id={a11y.id}
              name="fitReason"
              aria-invalid={a11y["aria-invalid"]}
              aria-describedby={a11y["aria-describedby"]}
              className={textareaClass}
              placeholder="Tell us about your audience and why you'd be a great affiliate..."
              required
            />
          )}
        </FormField>

        {errorMessage && (
          <div className="rounded-[var(--radius)] border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-[var(--space-4)] py-[0.6rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[#FCA5A5]">
            {errorMessage}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          loading={mutation.isPending}
          className="mt-[var(--space-2)] w-full"
        >
          Submit Application
        </Button>
      </form>
    </div>
  );
}
