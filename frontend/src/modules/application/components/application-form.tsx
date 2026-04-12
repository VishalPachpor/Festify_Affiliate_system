"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { TextInput } from "@/components/ui/text-input";
import { useSubmitApplication } from "../hooks/use-submit-application";
import { useTenant } from "@/modules/tenant-shell";
import {
  applicationSubmissionSchema,
  COMMUNICATION_CHANNEL_OPTIONS,
  type ApplicationSubmission,
} from "../types";

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

const selectClass = [
  "h-[var(--size-input)] w-full rounded-[var(--radius)] border border-[var(--color-border)]",
  "bg-[var(--color-input)] px-[var(--space-4)]",
  "font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]",
  "transition-colors duration-[var(--duration-normal)]",
  "hover:border-[var(--color-border-hover)]",
  "focus-visible:border-[var(--color-ring)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ring)]",
].join(" ");

const checkboxClass = [
  "size-[1rem] rounded border border-[var(--color-border)]",
  "bg-[var(--color-input)] text-[var(--color-primary)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]",
].join(" ");

type FieldErrors = Partial<Record<keyof ApplicationSubmission, string>>;

function toOptionalString(fd: FormData, key: string): string | undefined {
  const value = String(fd.get(key) ?? "").trim();
  return value || undefined;
}

export function ApplicationForm() {
  const { tenant } = useTenant();
  const [applyingAs, setApplyingAs] = useState<"individual" | "company">(
    "individual",
  );
  const [selectedChannels, setSelectedChannels] = useState<
    ApplicationSubmission["communicationChannels"]
  >([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { mutate, isPending, error } = useSubmitApplication(tenant?.id);

  const errorMessage = error instanceof Error ? error.message : null;

  const selectedChannelSet = useMemo(
    () => new Set(selectedChannels),
    [selectedChannels],
  );

  function toggleChannel(channel: ApplicationSubmission["communicationChannels"][number]) {
    setSelectedChannels((current) =>
      current.includes(channel)
        ? current.filter((value) => value !== channel)
        : [...current, channel],
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const payload: ApplicationSubmission = {
      applyingAs,
      fullName: toOptionalString(fd, "fullName"),
      email: toOptionalString(fd, "email"),
      telegramUsername: toOptionalString(fd, "telegramUsername"),
      companyName: toOptionalString(fd, "companyName"),
      contactPersonName: toOptionalString(fd, "contactPersonName"),
      contactPersonEmail: toOptionalString(fd, "contactPersonEmail"),
      signatoryName: toOptionalString(fd, "signatoryName"),
      signatoryEmail: toOptionalString(fd, "signatoryEmail"),
      contactPersonTelegramUsername: toOptionalString(
        fd,
        "contactPersonTelegramUsername",
      ),
      communicationChannels: selectedChannels,
      emailDatabaseSize: toOptionalString(fd, "emailDatabaseSize"),
      telegramGroupLink: toOptionalString(fd, "telegramGroupLink"),
      xProfileLink: toOptionalString(fd, "xProfileLink"),
      redditProfileLink: toOptionalString(fd, "redditProfileLink"),
      linkedInLink: toOptionalString(fd, "linkedInLink"),
      instagramAccountLink: toOptionalString(fd, "instagramAccountLink"),
      discordServerLink: toOptionalString(fd, "discordServerLink"),
      experience: toOptionalString(fd, "experience"),
      requestedCode: String(fd.get("requestedCode") ?? "")
        .trim()
        .toUpperCase(),
    };

    const parsed = applicationSubmissionSchema.safeParse(payload);
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ApplicationSubmission | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    mutate(parsed.data);
  }

  return (
    <div className="relative z-10 mx-auto max-w-[73rem]">
      <header>
        <h2 className="font-[var(--font-display)] text-[3rem] font-bold leading-[1.08] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
          Become an Affiliate
        </h2>
        <p className="mt-[var(--space-3)] max-w-[44rem] font-[var(--font-sans)] text-[var(--text-lg)] leading-[1.6] text-[var(--color-text-secondary)]">
          Join the affiliate program and earn 10% commission on every ticket sold.
        </p>
        <p className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[var(--tracking-caption)] text-[var(--color-text-secondary)]">
          Required fields marked with *
        </p>
      </header>

      <form
        className="mt-[var(--space-8)] flex flex-col gap-[var(--space-5)]"
        onSubmit={handleSubmit}
      >
        <FormField label="Applying As" required error={errors.applyingAs}>
          {(a11y) => (
            <select
              id={a11y.id}
              name="applyingAs"
              className={selectClass}
              value={applyingAs}
              onChange={(e) =>
                setApplyingAs(e.target.value as "individual" | "company")
              }
            >
              <option value="individual">Individual</option>
              <option value="company">Company</option>
            </select>
          )}
        </FormField>

        {applyingAs === "individual" ? (
          <div className="grid gap-[var(--space-4)] lg:grid-cols-2">
            <FormField
              label="Full Name (as per passport)"
              required
              error={errors.fullName}
            >
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="fullName"
                  placeholder="Your full legal name"
                  autoComplete="name"
                  required
                />
              )}
            </FormField>

            <FormField
              label="Email Address"
              required
              error={errors.email}
            >
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

            <FormField
              label="Telegram Username"
              required
              error={errors.telegramUsername}
            >
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="telegramUsername"
                  placeholder="@yourhandle"
                  autoComplete="off"
                  required
                />
              )}
            </FormField>

            <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-[var(--space-4)] py-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.6] text-[var(--color-text-secondary)]">
              If your application is approved, we will send the affiliate MOU,
              and this person&apos;s name will be listed as the signatory.
            </div>
          </div>
        ) : (
          <div className="grid gap-[var(--space-4)] lg:grid-cols-2">
            <FormField label="Company Name" required error={errors.companyName}>
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="companyName"
                  placeholder="Your organization"
                  autoComplete="organization"
                  required
                />
              )}
            </FormField>

            <FormField
              label="Contact Person Name"
              required
              error={errors.contactPersonName}
            >
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="contactPersonName"
                  placeholder="Primary contact"
                  autoComplete="name"
                  required
                />
              )}
            </FormField>

            <FormField
              label="Contact Person Email Address"
              required
              error={errors.contactPersonEmail}
            >
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="contactPersonEmail"
                  type="email"
                  placeholder="contact@company.com"
                  autoComplete="email"
                  spellCheck={false}
                  required
                />
              )}
            </FormField>

            <FormField
              label="Signatory Name"
              required
              error={errors.signatoryName}
            >
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="signatoryName"
                  placeholder="Authorized signatory"
                  autoComplete="name"
                  required
                />
              )}
            </FormField>

            <FormField
              label="Signatory Email Address"
              required
              error={errors.signatoryEmail}
            >
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="signatoryEmail"
                  type="email"
                  placeholder="signatory@company.com"
                  autoComplete="email"
                  spellCheck={false}
                  required
                />
              )}
            </FormField>

            <FormField
              label="Contact Person Telegram Username"
              required
              error={errors.contactPersonTelegramUsername}
            >
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="contactPersonTelegramUsername"
                  placeholder="@companycontact"
                  autoComplete="off"
                  required
                />
              )}
            </FormField>

            <div className="lg:col-span-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-[var(--space-4)] py-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.6] text-[var(--color-text-secondary)]">
              If your application is approved, we will send the affiliate MOU,
              and this person&apos;s name will be listed as the signatory on
              behalf of your organization.
            </div>
          </div>
        )}

        <FormField
          label="Which communication channels will you use to promote this event?"
          required
          error={errors.communicationChannels}
        >
          {() => (
            <div className="grid gap-[var(--space-3)] md:grid-cols-2 lg:grid-cols-4">
              {COMMUNICATION_CHANNEL_OPTIONS.map((channel) => (
                <label
                  key={channel.value}
                  className="flex items-center gap-[var(--space-3)] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-input)] px-[var(--space-4)] py-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]"
                >
                  <input
                    type="checkbox"
                    className={checkboxClass}
                    checked={selectedChannelSet.has(channel.value)}
                    onChange={() => toggleChannel(channel.value)}
                  />
                  <span>{channel.label}</span>
                </label>
              ))}
            </div>
          )}
        </FormField>

        <div className="grid gap-[var(--space-4)] lg:grid-cols-2">
          {selectedChannelSet.has("emails_newsletters") && (
            <FormField
              label="Email Database Size"
              required
              error={errors.emailDatabaseSize}
            >
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="emailDatabaseSize"
                  placeholder="e.g. 25,000 subscribers"
                  required
                />
              )}
            </FormField>
          )}

          {selectedChannelSet.has("telegram") && (
            <FormField
              label="Telegram Group/Channel Link"
              required
              error={errors.telegramGroupLink}
            >
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="telegramGroupLink"
                  placeholder="https://t.me/yourchannel"
                  required
                />
              )}
            </FormField>
          )}

          {selectedChannelSet.has("x") && (
            <FormField
              label="X (Twitter) Profile Link"
              required
              error={errors.xProfileLink}
            >
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="xProfileLink"
                  placeholder="https://x.com/yourhandle"
                  required
                />
              )}
            </FormField>
          )}

          {selectedChannelSet.has("reddit") && (
            <FormField
              label="Reddit Profile Link"
              required
              error={errors.redditProfileLink}
            >
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="redditProfileLink"
                  placeholder="https://reddit.com/u/yourprofile"
                  required
                />
              )}
            </FormField>
          )}

          {selectedChannelSet.has("linkedin") && (
            <FormField
              label="LinkedIn Link"
              required
              error={errors.linkedInLink}
            >
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="linkedInLink"
                  placeholder="https://linkedin.com/in/yourprofile"
                  required
                />
              )}
            </FormField>
          )}

          {selectedChannelSet.has("instagram") && (
            <FormField
              label="Instagram Account Link"
              required
              error={errors.instagramAccountLink}
            >
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="instagramAccountLink"
                  placeholder="https://instagram.com/yourhandle"
                  required
                />
              )}
            </FormField>
          )}

          {selectedChannelSet.has("discord") && (
            <FormField
              label="Discord Server Link"
              required
              error={errors.discordServerLink}
            >
              {(a11y) => (
                <TextInput
                  {...a11y}
                  name="discordServerLink"
                  placeholder="https://discord.gg/yourserver"
                  required
                />
              )}
            </FormField>
          )}
        </div>

        <FormField
          label="Previous Affiliate Partnership Experience at events (if any)"
          error={errors.experience}
        >
          {(a11y) => (
            <textarea
              id={a11y.id}
              name="experience"
              aria-invalid={a11y["aria-invalid"]}
              aria-describedby={a11y["aria-describedby"]}
              className={textareaClass}
              placeholder="Tell us about past affiliate work for conferences or events."
            />
          )}
        </FormField>

        <FormField
          label="Preferred Referral Code (e.g. SATOSHI2049)"
          required
          error={errors.requestedCode}
        >
          {(a11y) => (
            <TextInput
              {...a11y}
              name="requestedCode"
              placeholder="SATOSHI2049"
              autoComplete="off"
              maxLength={20}
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
          loading={isPending}
          className="mt-[var(--space-2)] w-full"
        >
          Submit
        </Button>
      </form>
    </div>
  );
}
