"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { TextInput } from "@/components/ui/text-input";
import { useSubmitApplication } from "../hooks/use-submit-application";
import { useTenant } from "@/modules/tenant-shell";

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

export function ApplicationForm() {
  const { tenant } = useTenant();
  const formRef = useRef<HTMLFormElement>(null);
  const { mutate, isPending } = useSubmitApplication(tenant?.id);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    mutate({
      firstName: (fd.get("firstName") as string) ?? "",
      email: (fd.get("email") as string) ?? "",
      socialProfiles: (fd.get("socialProfiles") as string) || undefined,
      audienceSize: (fd.get("audienceSize") as string) || undefined,
      experience: (fd.get("experience") as string) || undefined,
      fitReason: (fd.get("fitReason") as string) ?? "",
    });
  }

  return (
    <div className="relative z-10 mx-auto max-w-[73rem]">
      <header>
        <h2 className="font-[var(--font-display)] text-[3rem] font-bold leading-[1.08] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
          Become an Affiliate
        </h2>
        <p className="mt-[var(--space-3)] max-w-[44rem] font-[var(--font-sans)] text-[1.15rem] leading-[1.6] text-[var(--color-text-secondary)]">
          Join the affiliate program and earn 10% commission on every ticket sold.
        </p>
        <p className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[var(--tracking-caption)] text-[var(--color-text-secondary)]">
          Required fields marked with *
        </p>
      </header>

      <form
        ref={formRef}
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
                placeholder="e.g., 10K Twitter, 5K newsletter..."
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

        <Button
          type="submit"
          variant="primary"
          loading={isPending}
          className="mt-[var(--space-2)] w-full"
        >
          Submit
        </Button>
      </form>
    </div>
  );
}
