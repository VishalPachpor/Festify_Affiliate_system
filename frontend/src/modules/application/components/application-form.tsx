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

// ─── Styling ─────────────────────────────────────────────────────────────────

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

// ─── Types + helpers ─────────────────────────────────────────────────────────

type FormValues = {
  applyingAs: "individual" | "company";
  fullName: string;
  email: string;
  telegramUsername: string;
  companyName: string;
  contactPersonName: string;
  contactPersonEmail: string;
  signatoryName: string;
  signatoryEmail: string;
  contactPersonTelegramUsername: string;
  communicationChannels: ApplicationSubmission["communicationChannels"];
  emailDatabaseSize: string;
  telegramGroupLink: string;
  xProfileLink: string;
  redditProfileLink: string;
  linkedInLink: string;
  instagramAccountLink: string;
  discordServerLink: string;
  experience: string;
  requestedCode: string;
};

const INITIAL_VALUES: FormValues = {
  applyingAs: "individual",
  fullName: "",
  email: "",
  telegramUsername: "",
  companyName: "",
  contactPersonName: "",
  contactPersonEmail: "",
  signatoryName: "",
  signatoryEmail: "",
  contactPersonTelegramUsername: "",
  communicationChannels: [],
  emailDatabaseSize: "",
  telegramGroupLink: "",
  xProfileLink: "",
  redditProfileLink: "",
  linkedInLink: "",
  instagramAccountLink: "",
  discordServerLink: "",
  experience: "",
  requestedCode: "",
};

type FieldErrors = Partial<Record<keyof ApplicationSubmission, string>>;

function trimmed(v: string): string | undefined {
  const t = v.trim();
  return t || undefined;
}

function toPayload(values: FormValues): ApplicationSubmission {
  return {
    applyingAs: values.applyingAs,
    fullName: trimmed(values.fullName),
    email: trimmed(values.email),
    telegramUsername: trimmed(values.telegramUsername),
    companyName: trimmed(values.companyName),
    contactPersonName: trimmed(values.contactPersonName),
    contactPersonEmail: trimmed(values.contactPersonEmail),
    signatoryName: trimmed(values.signatoryName),
    signatoryEmail: trimmed(values.signatoryEmail),
    contactPersonTelegramUsername: trimmed(values.contactPersonTelegramUsername),
    communicationChannels: values.communicationChannels,
    emailDatabaseSize: trimmed(values.emailDatabaseSize),
    telegramGroupLink: trimmed(values.telegramGroupLink),
    xProfileLink: trimmed(values.xProfileLink),
    redditProfileLink: trimmed(values.redditProfileLink),
    linkedInLink: trimmed(values.linkedInLink),
    instagramAccountLink: trimmed(values.instagramAccountLink),
    discordServerLink: trimmed(values.discordServerLink),
    experience: trimmed(values.experience),
    requestedCode: values.requestedCode.trim().toUpperCase(),
  };
}

const STEPS = [
  { n: 1, label: "Applicant" },
  { n: 2, label: "Promotion" },
  { n: 3, label: "Finalize" },
] as const;

// Fields that live on each step — used to show per-step validation errors and
// to decide which slice of the schema a Next click should gate on.
const STEP_FIELDS: Record<1 | 2 | 3, (keyof ApplicationSubmission)[]> = {
  1: [
    "applyingAs",
    "fullName",
    "email",
    "telegramUsername",
    "companyName",
    "contactPersonName",
    "contactPersonEmail",
    "signatoryName",
    "signatoryEmail",
    "contactPersonTelegramUsername",
  ],
  2: [
    "communicationChannels",
    "emailDatabaseSize",
    "telegramGroupLink",
    "xProfileLink",
    "redditProfileLink",
    "linkedInLink",
    "instagramAccountLink",
    "discordServerLink",
  ],
  3: ["experience", "requestedCode"],
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ApplicationForm() {
  const { tenant } = useTenant();
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [errors, setErrors] = useState<FieldErrors>({});
  const { mutate, isPending, error } = useSubmitApplication(tenant?.id);

  const errorMessage = error instanceof Error ? error.message : null;
  const selectedChannelSet = useMemo(
    () => new Set(values.communicationChannels),
    [values.communicationChannels],
  );

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
    // Clear any existing error for this field as the user edits it.
    if (key in errors) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key as keyof ApplicationSubmission];
        return next;
      });
    }
  }

  function toggleChannel(channel: ApplicationSubmission["communicationChannels"][number]) {
    setValues((prev) => ({
      ...prev,
      communicationChannels: prev.communicationChannels.includes(channel)
        ? prev.communicationChannels.filter((v) => v !== channel)
        : [...prev.communicationChannels, channel],
    }));
    if (errors.communicationChannels) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.communicationChannels;
        return next;
      });
    }
  }

  // Runs the full schema but only surfaces errors belonging to the steps listed
  // in `gateSteps`. This lets Next gate on step 1+2 without demanding fields
  // that live on a later step.
  function validateSteps(gateSteps: Array<1 | 2 | 3>): FieldErrors | null {
    const parsed = applicationSubmissionSchema.safeParse(toPayload(values));
    if (parsed.success) return null;

    const gateFields = new Set(gateSteps.flatMap((s) => STEP_FIELDS[s]));
    const nextErrors: FieldErrors = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof ApplicationSubmission | undefined;
      if (key && gateFields.has(key) && !nextErrors[key]) {
        nextErrors[key] = issue.message;
      }
    }
    return Object.keys(nextErrors).length > 0 ? nextErrors : null;
  }

  function handleNext() {
    const gateErrors = validateSteps([step as 1 | 2]);
    if (gateErrors) {
      setErrors(gateErrors);
      return;
    }
    setErrors({});
    setStep((prev) => (prev === 1 ? 2 : prev === 2 ? 3 : 3) as 1 | 2 | 3);
  }

  function handleBack() {
    setErrors({});
    setStep((prev) => (prev === 3 ? 2 : prev === 2 ? 1 : 1) as 1 | 2 | 3);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Enter pressed inside a step-1/2 input fires the form's onSubmit, but
    // we never want to skip steps. Treat early-step submits as "Continue"
    // so the user can't accidentally bypass validation by pressing Enter.
    if (step < 3) {
      handleNext();
      return;
    }
    const parsed = applicationSubmissionSchema.safeParse(toPayload(values));
    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ApplicationSubmission | undefined;
        if (key && !nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setErrors(nextErrors);
      // Jump the user back to the first step that has an error.
      for (const s of [1, 2, 3] as const) {
        if (STEP_FIELDS[s].some((f) => nextErrors[f])) {
          setStep(s);
          break;
        }
      }
      return;
    }
    setErrors({});
    mutate(parsed.data);
  }

  // Contextual copy per step — drives the right-hand info panel so the form
  // reads like a guided flow, not a static questionnaire.
  const CONTEXT_PANEL: Record<1 | 2 | 3, { title: string; items: string[] }> = {
    1: {
      title: "Who's applying?",
      items: [
        "Pick Individual if you're promoting as yourself. Pick Company if a business is signing the MOU.",
        "The email you provide here is where we'll send the affiliate MOU once approved.",
        "Telegram is how our team reaches out during review and for ongoing partner comms.",
      ],
    },
    2: {
      title: "Where will you promote?",
      items: [
        "Top affiliates use 2–3 channels — more isn't always better. Pick the ones you actively post on.",
        "We'll ask for the exact link or audience size for each channel so we can estimate reach.",
        "You can add or change channels later once you're approved.",
      ],
    },
    3: {
      title: "Almost there",
      items: [
        "Your preferred referral code is how sales get attributed back to you. 6–20 characters, letters and numbers.",
        "Codes are case-insensitive and must be unique — we'll suggest an alternative if yours is taken.",
        "Past event partnerships help us fast-track review. Skip if this is your first time.",
      ],
    },
  };

  const ctaLabel =
    step === 1 ? "Continue to Promotion" : step === 2 ? "Review Application" : "Submit Application";

  return (
    <div className="relative z-10 mx-auto max-w-[73rem]">
      {/* Ambient radial glow — gives the page depth without a heavy overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 15% 10%, rgba(91,141,239,0.10), transparent 45%)",
        }}
      />

      <header>
        <h2 className="font-[var(--font-display)] text-[3rem] font-bold leading-[1.08] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
          Become an Affiliate
        </h2>
        <p className="mt-[var(--space-3)] max-w-[44rem] font-[var(--font-sans)] text-[var(--text-lg)] leading-[1.6] text-[var(--color-text-secondary)]">
          Join the affiliate program and earn 10% commission on every ticket sold.
        </p>
      </header>

      {/* Progress — numbered chips with labels, connected by a rule line.
          Active step glows; completed steps swap the number for a check. */}
      <nav aria-label="Application progress" className="mt-[var(--space-8)]">
        <ol className="flex items-center gap-[var(--space-3)]">
          {STEPS.map(({ n, label }, i) => {
            const isActive = step === n;
            const isDone = step > n;
            return (
              <li key={n} className="flex flex-1 items-center gap-[var(--space-3)] last:flex-none">
                <div className="flex items-center gap-[var(--space-3)]">
                  <span
                    className="flex size-[1.75rem] shrink-0 items-center justify-center rounded-full font-[var(--font-sans)] text-[var(--text-xs)] font-semibold transition-all duration-[var(--duration-normal)]"
                    style={{
                      background: isActive
                        ? "var(--color-primary)"
                        : isDone
                          ? "rgba(91,141,239,0.20)"
                          : "rgba(255,255,255,0.06)",
                      color: isActive
                        ? "#FFFFFF"
                        : isDone
                          ? "#A6D1FF"
                          : "rgba(255,255,255,0.50)",
                      boxShadow: isActive
                        ? "0 0 0 4px rgba(28,74,166,0.18), 0 0 24px rgba(91,141,239,0.25)"
                        : "none",
                    }}
                  >
                    {isDone ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3 7l3 3 5-6" />
                      </svg>
                    ) : (
                      n
                    )}
                  </span>
                  <span
                    className="font-[var(--font-sans)] text-[var(--text-sm)]"
                    style={{
                      color: isActive
                        ? "var(--color-text-primary)"
                        : isDone
                          ? "#A6D1FF"
                          : "rgba(255,255,255,0.45)",
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    {label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="h-[1px] flex-1"
                    style={{
                      background: isDone
                        ? "rgba(91,141,239,0.30)"
                        : "rgba(255,255,255,0.08)",
                    }}
                  />
                )}
              </li>
            );
          })}
        </ol>
        <p className="mt-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[var(--tracking-caption)] text-[var(--color-text-secondary)]">
          Required fields marked with *
        </p>
      </nav>

      {/* Two-column: form (left) + contextual info panel (right). On narrow
          screens the panel falls below the form so the flow stays linear. */}
      <div className="mt-[var(--space-8)] grid gap-[var(--space-8)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <form
        key={`step-${step}`}
        className="flex flex-col gap-[var(--space-8)] motion-safe:animate-[step-enter_0.28s_ease-out]"
        onSubmit={handleSubmit}
      >
        {step === 1 && (
          <fieldset className="flex flex-col gap-[var(--space-6)]">
            <legend className="sr-only">Applicant</legend>

            <FormField label="Applying As" required error={errors.applyingAs}>
              {(a11y) => (
                <select
                  id={a11y.id}
                  name="applyingAs"
                  className={selectClass}
                  value={values.applyingAs}
                  onChange={(e) =>
                    setField("applyingAs", e.target.value as "individual" | "company")
                  }
                >
                  <option value="individual">Individual</option>
                  <option value="company">Company</option>
                </select>
              )}
            </FormField>

            {values.applyingAs === "individual" ? (
              <div className="grid gap-[var(--space-6)] lg:grid-cols-2">
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
                      value={values.fullName}
                      onChange={(e) => setField("fullName", e.target.value)}
                    />
                  )}
                </FormField>

                <FormField label="Email Address" required error={errors.email}>
                  {(a11y) => (
                    <TextInput
                      {...a11y}
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      autoComplete="email"
                      spellCheck={false}
                      value={values.email}
                      onChange={(e) => setField("email", e.target.value)}
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
                      value={values.telegramUsername}
                      onChange={(e) => setField("telegramUsername", e.target.value)}
                    />
                  )}
                </FormField>

                <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-[var(--space-4)] py-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.6] text-[var(--color-text-secondary)]">
                  If your application is approved, we will send the affiliate MOU,
                  and this person&apos;s name will be listed as the signatory.
                </div>
              </div>
            ) : (
              <div className="grid gap-[var(--space-6)] lg:grid-cols-2">
                <FormField label="Company Name" required error={errors.companyName}>
                  {(a11y) => (
                    <TextInput
                      {...a11y}
                      name="companyName"
                      placeholder="Your organization"
                      autoComplete="organization"
                      value={values.companyName}
                      onChange={(e) => setField("companyName", e.target.value)}
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
                      value={values.contactPersonName}
                      onChange={(e) => setField("contactPersonName", e.target.value)}
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
                      value={values.contactPersonEmail}
                      onChange={(e) => setField("contactPersonEmail", e.target.value)}
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
                      value={values.signatoryName}
                      onChange={(e) => setField("signatoryName", e.target.value)}
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
                      value={values.signatoryEmail}
                      onChange={(e) => setField("signatoryEmail", e.target.value)}
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
                      value={values.contactPersonTelegramUsername}
                      onChange={(e) =>
                        setField("contactPersonTelegramUsername", e.target.value)
                      }
                    />
                  )}
                </FormField>

                <div className="lg:col-span-2 rounded-[var(--radius)] border border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] px-[var(--space-4)] py-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.6] text-[var(--color-text-secondary)]">
                  If your application is approved, we will send the affiliate MOU,
                  and the signatory&apos;s name will be listed as the signatory on
                  behalf of your organization.
                </div>
              </div>
            )}
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="flex flex-col gap-[var(--space-6)]">
            <legend className="sr-only">Promotion channels</legend>

            <FormField
              label="Which communication channels will you use to promote this event?"
              required
              error={errors.communicationChannels}
            >
              {() => (
                <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
                  {COMMUNICATION_CHANNEL_OPTIONS.map((channel) => {
                    const selected = selectedChannelSet.has(channel.value);
                    return (
                      <label
                        key={channel.value}
                        className="group flex cursor-pointer items-center justify-between gap-[var(--space-3)] rounded-[var(--radius-md)] border px-[var(--space-4)] py-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] transition-all duration-[var(--duration-normal)]"
                        style={{
                          borderColor: selected
                            ? "rgba(91,141,239,0.45)"
                            : "rgba(255,255,255,0.08)",
                          background: selected
                            ? "rgba(91,141,239,0.10)"
                            : "var(--color-input)",
                          color: selected
                            ? "var(--color-text-primary)"
                            : "rgba(255,255,255,0.80)",
                          boxShadow: selected
                            ? "0 0 0 1px rgba(91,141,239,0.25), 0 4px 16px rgba(91,141,239,0.10)"
                            : "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selected}
                          onChange={() => toggleChannel(channel.value)}
                        />
                        <span className="font-medium">{channel.label}</span>
                        <span
                          aria-hidden="true"
                          className="flex size-[1.125rem] shrink-0 items-center justify-center rounded-full transition-colors duration-[var(--duration-fast)]"
                          style={{
                            background: selected
                              ? "var(--color-primary)"
                              : "rgba(255,255,255,0.06)",
                            border: selected
                              ? "1px solid rgba(91,141,239,0.50)"
                              : "1px solid rgba(255,255,255,0.12)",
                          }}
                        >
                          {selected ? (
                            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 7l3 3 5-6" />
                            </svg>
                          ) : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </FormField>

            {(selectedChannelSet.has("emails_newsletters") ||
              selectedChannelSet.has("telegram") ||
              selectedChannelSet.has("x") ||
              selectedChannelSet.has("reddit") ||
              selectedChannelSet.has("linkedin") ||
              selectedChannelSet.has("instagram") ||
              selectedChannelSet.has("discord")) && (
              <div className="grid gap-[var(--space-6)] lg:grid-cols-2">
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
                        value={values.emailDatabaseSize}
                        onChange={(e) => setField("emailDatabaseSize", e.target.value)}
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
                        value={values.telegramGroupLink}
                        onChange={(e) => setField("telegramGroupLink", e.target.value)}
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
                        value={values.xProfileLink}
                        onChange={(e) => setField("xProfileLink", e.target.value)}
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
                        value={values.redditProfileLink}
                        onChange={(e) => setField("redditProfileLink", e.target.value)}
                      />
                    )}
                  </FormField>
                )}

                {selectedChannelSet.has("linkedin") && (
                  <FormField label="LinkedIn Link" required error={errors.linkedInLink}>
                    {(a11y) => (
                      <TextInput
                        {...a11y}
                        name="linkedInLink"
                        placeholder="https://linkedin.com/in/yourprofile"
                        value={values.linkedInLink}
                        onChange={(e) => setField("linkedInLink", e.target.value)}
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
                        value={values.instagramAccountLink}
                        onChange={(e) =>
                          setField("instagramAccountLink", e.target.value)
                        }
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
                        value={values.discordServerLink}
                        onChange={(e) =>
                          setField("discordServerLink", e.target.value)
                        }
                      />
                    )}
                  </FormField>
                )}
              </div>
            )}
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className="flex flex-col gap-[var(--space-6)]">
            <legend className="sr-only">Finalize</legend>

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
                  value={values.experience}
                  onChange={(e) => setField("experience", e.target.value)}
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
                  value={values.requestedCode}
                  onChange={(e) =>
                    setField("requestedCode", e.target.value.toUpperCase())
                  }
                />
              )}
            </FormField>

            {errorMessage && (
              <div className="rounded-[var(--radius)] border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-[var(--space-4)] py-[0.6rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[#FCA5A5]">
                {errorMessage}
              </div>
            )}
          </fieldset>
        )}

        {/* Step navigation — Back stays left, primary action lives on the right */}
        <div className="flex items-center justify-between gap-[var(--space-4)]">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            disabled={step === 1}
            className={step === 1 ? "invisible" : ""}
          >
            Back
          </Button>

          {step < 3 ? (
            <Button type="button" variant="primary" onClick={handleNext}>
              {ctaLabel}
            </Button>
          ) : (
            <Button type="submit" variant="primary" loading={isPending}>
              {ctaLabel}
            </Button>
          )}
        </div>
      </form>

      {/* Contextual info panel — updates per step. Gives the right column a
          purpose beyond dead space and quietly teaches the user what we're
          asking for and why. */}
      <aside
        key={`panel-${step}`}
        className="self-start rounded-[var(--radius-lg)] border border-[rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)] p-[var(--space-6)] motion-safe:animate-[step-enter_0.28s_ease-out]"
      >
        <p className="font-[var(--font-sans)] text-[var(--text-xs)] font-semibold uppercase tracking-[0.08em] text-[#A6D1FF]">
          Step {step} of {STEPS.length}
        </p>
        <h3 className="mt-[var(--space-2)] font-[var(--font-display)] text-[var(--text-xl)] font-bold leading-tight tracking-[-0.02em] text-[var(--color-text-primary)]">
          {CONTEXT_PANEL[step].title}
        </h3>
        <ul className="mt-[var(--space-4)] flex flex-col gap-[var(--space-3)]">
          {CONTEXT_PANEL[step].items.map((item, i) => (
            <li
              key={i}
              className="relative pl-[var(--space-5)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.55] text-[var(--color-text-secondary)]"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-[0.55rem] size-[0.375rem] rounded-full"
                style={{ background: "rgba(91,141,239,0.55)" }}
              />
              {item}
            </li>
          ))}
        </ul>
        <div
          className="mt-[var(--space-6)] rounded-[var(--radius-md)] border border-[rgba(91,141,239,0.20)] bg-[rgba(91,141,239,0.06)] p-[var(--space-4)]"
        >
          <p className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[#A6D1FF]">
            What happens next
          </p>
          <p className="mt-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.6] text-[var(--color-text-secondary)]">
            Once you submit, the team reviews within 24 hours and emails the
            MOU. You&apos;ll see your status update inside this dashboard.
          </p>
        </div>
      </aside>
      </div>
    </div>
  );
}
