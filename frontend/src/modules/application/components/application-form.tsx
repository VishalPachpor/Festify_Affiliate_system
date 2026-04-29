"use client";

import { useMemo, useState } from "react";
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

// ─── Channel icons ───────────────────────────────────────────────────────────

function ChIconEmail() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="16" height="12" rx="2" />
      <path d="M2 6l8 5 8-5" />
    </svg>
  );
}
function ChIconTelegram() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9.5l14-5-2.5 12-4-3-2 2v-3.5L15 5" />
    </svg>
  );
}
function ChIconWhatsapp() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17l1.2-3.5A6.5 6.5 0 1 1 7 16l-4 1z" />
    </svg>
  );
}
function ChIconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M13.7 2h2.6l-5.7 6.5L17 18h-5.2L7.7 12.5 2.9 18H.3l6.1-7L0 2h5.3l3.8 5.1L13.7 2zm-.9 14.4h1.4L5.3 3.5H3.8l9 12.9z" />
    </svg>
  );
}
function ChIconReddit() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="10" cy="11" r="6.5" />
      <circle cx="16.5" cy="5.5" r="1.2" />
      <path d="M10 5l.7-2.5L13 3" />
      <circle cx="7.8" cy="10.5" r="0.6" fill="currentColor" />
      <circle cx="12.2" cy="10.5" r="0.6" fill="currentColor" />
      <path d="M7.5 13.2c.8.6 1.6.8 2.5.8s1.7-.2 2.5-.8" />
    </svg>
  );
}
function ChIconLinkedIn() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M4 2.5A1.5 1.5 0 1 1 4 5.5a1.5 1.5 0 0 1 0-3zM2.8 7h2.4v10H2.8V7zm4.6 0h2.3v1.4h.03c.33-.6 1.1-1.25 2.3-1.25 2.45 0 2.9 1.6 2.9 3.65V17h-2.4v-4.5c0-1.07-.03-2.44-1.5-2.44s-1.73 1.16-1.73 2.37V17H7.4V7z" />
    </svg>
  );
}
function ChIconInstagram() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="2.5" width="15" height="15" rx="4" />
      <circle cx="10" cy="10" r="3.5" />
      <circle cx="14.5" cy="5.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}
function ChIconDiscord() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M16.5 4.5A13 13 0 0 0 13.2 3.5l-.2.4c1.2.3 2.3.8 3.2 1.5a9 9 0 0 0-11.4 0c.9-.7 2-1.2 3.2-1.5l-.2-.4a13 13 0 0 0-3.3 1A15 15 0 0 0 1.5 13c1.3 1 2.6 1.7 3.9 2l.8-1.1c-.6-.2-1.2-.5-1.7-.9l.3-.2A8.5 8.5 0 0 0 10 14c1.8 0 3.5-.5 5.2-1.3l.3.2c-.5.4-1.1.7-1.7.9l.8 1.1c1.3-.3 2.6-1 3.9-2a15 15 0 0 0-2-8.5zM7.3 11c-.7 0-1.3-.7-1.3-1.5s.6-1.5 1.3-1.5 1.3.7 1.3 1.5S8 11 7.3 11zm5.4 0c-.7 0-1.3-.7-1.3-1.5s.6-1.5 1.3-1.5 1.3.7 1.3 1.5-.6 1.5-1.3 1.5z" />
    </svg>
  );
}

const CHANNEL_ICON: Record<string, () => React.JSX.Element> = {
  emails_newsletters: ChIconEmail,
  telegram: ChIconTelegram,
  whatsapp: ChIconWhatsapp,
  x: ChIconX,
  reddit: ChIconReddit,
  linkedin: ChIconLinkedIn,
  instagram: ChIconInstagram,
  discord: ChIconDiscord,
};

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
  { n: 1, label: "Basic" },
  { n: 2, label: "Marketing channels" },
  { n: 3, label: "Review" },
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
    "requestedCode",
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
    "experience",
  ],
  3: [],
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

  const ctaLabel =
    step === 1 ? "Continue to Marketing Channels" : step === 2 ? "Review Application" : "Submit Application";

  return (
    <div className="relative z-10 mx-auto max-w-[48rem]">
      {/* Ambient backdrop lives on DashboardStageCanvas so the orbs span the
          full content area (and all other admin/affiliate pages use the same
          treatment). No per-form backdrop here — it would double up. */}

      <header>
        <h2 className="font-[var(--font-display)] font-bold text-[var(--text-2xl)] leading-[var(--leading-tight)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
          Become a Marketing Partner
        </h2>
        <p className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-base)] leading-[1.6] text-[var(--color-text-secondary)]">
          Join the marketing partner program and earn commission on every TOKEN2049 ticket sold.
        </p>
      </header>

      {/* Glass form container — translucent surface over the ambient backdrop.
          Slightly brighter bg (0.04) than the previous pass so the card lifts
          off the page instead of blending in. */}
      <div
        className="relative mt-[var(--space-8)] rounded-[var(--radius-xl)] border p-[var(--space-8)] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] backdrop-blur-[12px]"
        style={{
          borderColor: "rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)",
        }}
      >

      {/* Progress — numbered chips with labels, connected by a rule line.
          Active step glows; completed steps swap the number for a check. */}
      <nav aria-label="Application progress">
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
      </nav>

      <form
        key={`step-${step}`}
        className="mt-[var(--space-8)] flex flex-col gap-[var(--space-8)] motion-safe:animate-[step-enter_0.28s_ease-out]"
        onSubmit={handleSubmit}
      >
        {step === 1 && (
          <fieldset className="flex flex-col gap-[var(--space-6)]">
            <legend className="sr-only">Applicant</legend>

            {/* Big selection cards replace the Applying-as dropdown.
                Interaction-first: the user picks an identity, then the form
                reveals the matching detail fields below. */}
            <div>
              <p className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                Applying as?
              </p>
              <div className="mt-[var(--space-3)] grid grid-cols-2 gap-[var(--space-3)]">
                {([
                  {
                    value: "individual" as const,
                    title: "Individual",
                    description: "MOU will be signed by the individual.",
                    icon: (
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="11" cy="8" r="4" />
                        <path d="M3 19c0-3.5 3.5-6 8-6s8 2.5 8 6" />
                      </svg>
                    ),
                  },
                  {
                    value: "company" as const,
                    title: "Company",
                    description: "MOU will be signed by the signatory of the business.",
                    icon: (
                      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="4" width="16" height="15" rx="2" />
                        <path d="M3 9h16M8 13h2M8 16h2M13 13h2M13 16h2" />
                      </svg>
                    ),
                  },
                ]).map((opt) => {
                  const selected = values.applyingAs === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setField("applyingAs", opt.value)}
                      aria-pressed={selected}
                      className="group relative flex flex-col items-start gap-[var(--space-2)] rounded-[var(--radius-md)] border p-[var(--space-5)] text-left transition-all duration-[var(--duration-normal)] focus-visible:outline-none"
                      style={{
                        borderColor: selected ? "rgba(91,141,239,0.50)" : "rgba(255,255,255,0.08)",
                        background: selected ? "rgba(91,141,239,0.08)" : "var(--color-input)",
                        boxShadow: selected
                          ? "0 0 0 1px rgba(91,141,239,0.30), 0 12px 32px rgba(91,141,239,0.12)"
                          : "none",
                      }}
                    >
                      <span
                        className="flex size-[2.25rem] items-center justify-center rounded-[var(--radius-sm)] transition-colors"
                        style={{
                          background: selected ? "rgba(91,141,239,0.18)" : "rgba(255,255,255,0.04)",
                          color: selected ? "#A6D1FF" : "rgba(255,255,255,0.55)",
                        }}
                      >
                        {opt.icon}
                      </span>
                      <span
                        className="font-[var(--font-display)] text-[var(--text-base)] font-bold tracking-[-0.01em]"
                        style={{
                          color: selected ? "var(--color-text-primary)" : "rgba(255,255,255,0.85)",
                        }}
                      >
                        {opt.title}
                      </span>
                      <span className="font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.5] text-[var(--color-text-secondary)]">
                        {opt.description}
                      </span>
                      {selected && (
                        <span
                          aria-hidden="true"
                          className="absolute right-[var(--space-4)] top-[var(--space-4)] flex size-[1.25rem] items-center justify-center rounded-full"
                          style={{ background: "var(--color-primary)" }}
                        >
                          <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 7l3 3 5-6" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {values.applyingAs === "individual" ? (
              <div className="grid gap-[var(--space-6)] lg:grid-cols-2">
                <FormField labelCase="normal"
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

                <FormField labelCase="normal"
                  label="Email Address"
                  required
                  error={errors.email}
                  hint="We'll send the affiliate MOU here once approved. This person will be the signatory."
                >
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

                <FormField labelCase="normal"
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
              </div>
            ) : (
              <div className="grid gap-[var(--space-6)] lg:grid-cols-2">
                <FormField labelCase="normal" label="Company Name" required error={errors.companyName}>
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

                <FormField labelCase="normal"
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

                <FormField labelCase="normal"
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

                <FormField labelCase="normal"
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

                <FormField labelCase="normal"
                  label="Signatory Email Address"
                  required
                  error={errors.signatoryEmail}
                  hint="We'll send the affiliate MOU here for signing on behalf of your organization."
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

                <FormField labelCase="normal"
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
              </div>
            )}

            <FormField labelCase="normal"
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
          </fieldset>
        )}

        {step === 2 && (
          <fieldset className="flex flex-col gap-[var(--space-6)]">
            <legend className="sr-only">Promotion channels</legend>

            <FormField
              labelCase="normal"
              label="Which communication channels will you use to promote this event?"
              required
              error={errors.communicationChannels}
            >
              {() => (
                <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
                  {COMMUNICATION_CHANNEL_OPTIONS.map((channel) => {
                    const selected = selectedChannelSet.has(channel.value);
                    const Icon = CHANNEL_ICON[channel.value];
                    return (
                      <label
                        key={channel.value}
                        className="group flex cursor-pointer items-center gap-[var(--space-3)] rounded-[var(--radius-md)] border px-[var(--space-4)] py-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] transition-all duration-[var(--duration-normal)] hover:-translate-y-px"
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
                            ? "0 0 0 1px rgba(91,141,239,0.25), 0 8px 24px rgba(91,141,239,0.14)"
                            : "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={selected}
                          onChange={() => toggleChannel(channel.value)}
                        />
                        <span
                          className="flex size-[2rem] shrink-0 items-center justify-center rounded-[var(--radius-sm)] transition-colors"
                          style={{
                            background: selected
                              ? "rgba(91,141,239,0.18)"
                              : "rgba(255,255,255,0.04)",
                            color: selected ? "#A6D1FF" : "rgba(255,255,255,0.60)",
                          }}
                        >
                          {Icon ? <Icon /> : null}
                        </span>
                        <span className="flex-1 font-medium">{channel.label}</span>
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
                  <FormField labelCase="normal"
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
                  <FormField labelCase="normal"
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
                  <FormField labelCase="normal"
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
                  <FormField labelCase="normal"
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
                  <FormField labelCase="normal" label="LinkedIn Link" required error={errors.linkedInLink}>
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
                  <FormField labelCase="normal"
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
                  <FormField labelCase="normal"
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

            <FormField labelCase="normal"
              label="Previous Marketing Partnership Experience at events (if any)"
              error={errors.experience}
            >
              {(a11y) => (
                <textarea
                  id={a11y.id}
                  name="experience"
                  aria-invalid={a11y["aria-invalid"]}
                  aria-describedby={a11y["aria-describedby"]}
                  className={textareaClass}
                  placeholder="Tell us about past marketing partnership work for conferences or events."
                  value={values.experience}
                  onChange={(e) => setField("experience", e.target.value)}
                />
              )}
            </FormField>
          </fieldset>
        )}

        {step === 3 && (
          <fieldset className="flex flex-col gap-[var(--space-6)]">
            <legend className="sr-only">Finalize</legend>

            {/* Celebration header — reframes the last step from "one more form"
                to "you're almost done" so submission feels like an arrival. */}
            <div
              className="rounded-[var(--radius-lg)] border p-[var(--space-6)] text-center"
              style={{
                borderColor: "rgba(91,141,239,0.25)",
                background:
                  "linear-gradient(180deg, rgba(91,141,239,0.10) 0%, rgba(91,141,239,0.02) 100%)",
              }}
            >
              <div
                aria-hidden="true"
                className="mx-auto flex size-[3rem] items-center justify-center rounded-full"
                style={{ background: "rgba(91,141,239,0.16)", color: "#A6D1FF" }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 6.2L21 9l-5 4.4L17.6 20 12 16.8 6.4 20 8 13.4 3 9l6.6-.8L12 2z" />
                </svg>
              </div>
              <h3 className="mt-[var(--space-3)] font-[var(--font-display)] text-[var(--text-xl)] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
                Almost there
              </h3>
              <p className="mx-auto mt-[var(--space-2)] max-w-[28rem] font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.55] text-[var(--color-text-secondary)]">
                You&apos;re about to join the TOKEN2049 marketing partners.
                Review your answers below — submit when everything looks right.
              </p>
            </div>

            <ReviewSummary values={values} />

            {errorMessage && (
              <div className="rounded-[var(--radius)] border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-[var(--space-4)] py-[0.6rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[#FCA5A5]">
                {errorMessage}
              </div>
            )}
          </fieldset>
        )}

        {/* Footer actions. Back stays bottom-left as a secondary action;
            primary CTA gets the gradient + glow on the right. */}
        <div className="flex items-center justify-between gap-[var(--space-4)]">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              className="group inline-flex h-[2.75rem] items-center gap-[var(--space-2)] rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.04)] px-[var(--space-5)] font-[var(--font-sans)] text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)] transition-all hover:border-[rgba(255,255,255,0.20)] hover:bg-[rgba(255,255,255,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-page)]"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:-translate-x-0.5">
                <path d="M11 7H3M7 3L3 7l4 4" />
              </svg>
              Back
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="group inline-flex h-[2.75rem] items-center gap-[var(--space-2)] rounded-[var(--radius)] px-[var(--space-6)] font-[var(--font-sans)] text-[var(--text-sm)] font-semibold text-white transition-all hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-page)]"
              style={{
                background:
                  "linear-gradient(135deg, #3b82f6 0%, #1c4aa6 100%)",
                boxShadow:
                  "0 10px 30px rgba(59,130,246,0.30), 0 0 0 1px rgba(255,255,255,0.06) inset",
              }}
            >
              {ctaLabel}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
                <path d="M3 7h8M7 3l4 4-4 4" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={isPending}
              className="group inline-flex h-[2.75rem] items-center gap-[var(--space-2)] rounded-[var(--radius)] px-[var(--space-6)] font-[var(--font-sans)] text-[var(--text-sm)] font-semibold text-white transition-all hover:-translate-y-px active:translate-y-0 disabled:opacity-70 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-page)]"
              style={{
                background:
                  "linear-gradient(135deg, #3b82f6 0%, #1c4aa6 100%)",
                boxShadow:
                  "0 10px 30px rgba(59,130,246,0.30), 0 0 0 1px rgba(255,255,255,0.06) inset",
              }}
            >
              {isPending ? "Submitting…" : ctaLabel}
              {!isPending && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7l3 3 5-6" />
                </svg>
              )}
            </button>
          )}
        </div>
      </form>
      </div>
    </div>
  );
}

// ─── Review summary ──────────────────────────────────────────────────────────
// Read-only list of every value the applicant filled in. Step 3 ("Review") is
// purely confirmation — fields live on earlier steps and the user goes back to
// edit them.

function ReviewSummary({ values }: { values: FormValues }) {
  const channelLabelByValue = new Map(
    COMMUNICATION_CHANNEL_OPTIONS.map((c) => [c.value, c.label]),
  );
  const channelLabels = values.communicationChannels
    .map((c) => channelLabelByValue.get(c) ?? c)
    .join(", ");

  const channelLinks: Array<{ label: string; value: string }> = [];
  if (values.emailDatabaseSize) channelLinks.push({ label: "Email Database Size", value: values.emailDatabaseSize });
  if (values.telegramGroupLink) channelLinks.push({ label: "Telegram Group", value: values.telegramGroupLink });
  if (values.xProfileLink) channelLinks.push({ label: "X (Twitter)", value: values.xProfileLink });
  if (values.redditProfileLink) channelLinks.push({ label: "Reddit", value: values.redditProfileLink });
  if (values.linkedInLink) channelLinks.push({ label: "LinkedIn", value: values.linkedInLink });
  if (values.instagramAccountLink) channelLinks.push({ label: "Instagram", value: values.instagramAccountLink });
  if (values.discordServerLink) channelLinks.push({ label: "Discord", value: values.discordServerLink });

  const identityRows: Array<{ label: string; value: string }> =
    values.applyingAs === "individual"
      ? [
          { label: "Applying as", value: "Individual" },
          { label: "Full name", value: values.fullName || "—" },
          { label: "Email", value: values.email || "—" },
          { label: "Telegram", value: values.telegramUsername || "—" },
        ]
      : [
          { label: "Applying as", value: "Company" },
          { label: "Company name", value: values.companyName || "—" },
          { label: "Contact person", value: values.contactPersonName || "—" },
          { label: "Contact email", value: values.contactPersonEmail || "—" },
          { label: "Contact Telegram", value: values.contactPersonTelegramUsername || "—" },
          { label: "Signatory name", value: values.signatoryName || "—" },
          { label: "Signatory email", value: values.signatoryEmail || "—" },
        ];

  identityRows.push({ label: "Referral code", value: values.requestedCode || "—" });

  return (
    <div className="flex flex-col gap-[var(--space-5)]">
      <ReviewSection title="Basic">
        <ReviewRows rows={identityRows} />
      </ReviewSection>

      <ReviewSection title="Marketing channels">
        <ReviewRows
          rows={[
            { label: "Channels", value: channelLabels || "—" },
            ...channelLinks,
            {
              label: "Previous experience",
              value: values.experience || "—",
            },
          ]}
        />
      </ReviewSection>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[var(--radius-md)] border p-[var(--space-5)]"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <p className="font-[var(--font-sans)] text-[var(--text-xs)] font-semibold uppercase tracking-[var(--tracking-caption)] text-[var(--color-text-secondary)]">
        {title}
      </p>
      <div className="mt-[var(--space-3)]">{children}</div>
    </div>
  );
}

function ReviewRows({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <dl className="flex flex-col gap-[var(--space-2)]">
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[10rem_1fr] gap-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)]"
        >
          <dt className="text-[var(--color-text-secondary)]">{row.label}</dt>
          <dd className="text-[var(--color-text-primary)] break-words">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
