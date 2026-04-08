"use client";

type ProfileVariant = "admin" | "affiliate";

type ProfilePageProps = {
  variant: ProfileVariant;
};

type Field = {
  label: string;
  value: string;
};

const PROFILE_COPY: Record<
  ProfileVariant,
  {
    role: string;
    subtitle: string;
    summaryTitle: string;
    summaryLines: string[];
    personal: Field[];
    account: Field[];
    notifications: Field[];
  }
> = {
  admin: {
    role: "Organizer Admin",
    subtitle: "Manage your account identity, contact information, team access, and notification preferences.",
    summaryTitle: "Account Summary",
    summaryLines: ["Primary admin", "Singapore 2026", "2FA recommended"],
    personal: [
      { label: "Full Name", value: "John Doe" },
      { label: "Work Email", value: "john@token2049.com" },
      { label: "Phone", value: "+65 8123 4567" },
    ],
    account: [
      { label: "Organization", value: "TOKEN2049 Singapore 2026" },
      { label: "Role", value: "Super Admin" },
      { label: "Timezone", value: "Asia/Singapore" },
    ],
    notifications: [
      { label: "Security Alerts", value: "Enabled" },
      { label: "Campaign Updates", value: "Enabled" },
      { label: "Payout Alerts", value: "Daily digest" },
    ],
  },
  affiliate: {
    role: "Affiliate Partner",
    subtitle: "Manage your public profile, payout contact details, security preferences, and notification settings.",
    summaryTitle: "Affiliate Summary",
    summaryLines: ["Gold Tier", "Code: JOHN948", "Payouts active"],
    personal: [
      { label: "Full Name", value: "John Doe" },
      { label: "Email", value: "john@example.com" },
      { label: "Location", value: "Singapore" },
    ],
    account: [
      { label: "Affiliate Code", value: "JOHN948" },
      { label: "Payout Email", value: "payouts@johnmedia.co" },
      { label: "Primary Audience", value: "Events & Web3" },
    ],
    notifications: [
      { label: "New Sale Alerts", value: "Enabled" },
      { label: "Milestone Alerts", value: "Enabled" },
      { label: "Payout Updates", value: "Instant" },
    ],
  },
};

function SectionCard({
  title,
  description,
  fields,
}: {
  title: string;
  description: string;
  fields: Field[];
}) {
  return (
    <section className="rounded-[0.7rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(24,29,48,0.52)] px-[1.4rem] py-[1.35rem]">
      <h3 className="font-[var(--font-display)] text-[1.55rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
        {title}
      </h3>
      <p className="mt-[0.35rem] font-[var(--font-sans)] text-[0.95rem] leading-[1.45rem] text-[rgba(255,255,255,0.58)]">
        {description}
      </p>

      <div className="mt-[1.35rem] grid grid-cols-1 gap-[1rem] md:grid-cols-2">
        {fields.map((field) => (
          <div key={field.label} className="rounded-[0.6rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(17,21,34,0.96)] px-[1rem] py-[0.9rem]">
            <p className="font-[var(--font-sans)] text-[0.76rem] font-semibold uppercase tracking-[0.2rem] text-[rgba(255,255,255,0.82)]">
              {field.label}
            </p>
            <p className="mt-[0.45rem] font-[var(--font-sans)] text-[1rem] leading-[1.4rem] text-[var(--color-text-primary)]">
              {field.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProfilePage({ variant }: ProfilePageProps) {
  const copy = PROFILE_COPY[variant];

  return (
    <div className="px-[2rem] py-[1.8rem]">
      <div className="grid gap-[1.5rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-[1.5rem]">
          <section className="rounded-[0.8rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(24,29,48,0.52)] px-[1.5rem] py-[1.45rem]">
            <div className="flex flex-col gap-[1rem] md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-[1rem]">
                <div className="flex size-[4.25rem] items-center justify-center rounded-full bg-[var(--color-primary)]">
                  <span className="font-[var(--font-sans)] text-[1.1rem] font-semibold text-[var(--color-primary-foreground)]">
                    JD
                  </span>
                </div>
                <div>
                  <h2 className="font-[var(--font-display)] text-[2rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
                    John Doe
                  </h2>
                  <p className="mt-[0.35rem] font-[var(--font-sans)] text-[1rem] leading-[1.5rem] text-[rgba(255,255,255,0.62)]">
                    {copy.role}
                  </p>
                </div>
              </div>

              <div className="flex gap-[0.9rem]">
                <button
                  type="button"
                  className="h-[3rem] rounded-[0.65rem] bg-[var(--color-primary)] px-[1.4rem] font-[var(--font-sans)] text-[0.95rem] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  className="h-[3rem] rounded-[0.65rem] border border-[rgba(255,255,255,0.12)] bg-transparent px-[1.4rem] font-[var(--font-sans)] text-[0.95rem] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.05)]"
                >
                  Reset
                </button>
              </div>
            </div>

            <p className="mt-[1rem] max-w-[42rem] font-[var(--font-sans)] text-[1rem] leading-[1.55rem] text-[rgba(255,255,255,0.58)]">
              {copy.subtitle}
            </p>

            <div className="mt-[1.25rem] flex flex-wrap gap-[0.7rem]">
              {["Profile", "Security", "Notifications"].map((tab, index) => (
                <button
                  key={tab}
                  type="button"
                  className={[
                    "rounded-[0.6rem] px-[1rem] py-[0.55rem] font-[var(--font-sans)] text-[0.9rem] transition-colors",
                    index === 0
                      ? "bg-[rgba(255,255,255,0.96)] text-[var(--color-text-dark)]"
                      : "bg-[rgba(17,21,34,0.96)] text-[rgba(255,255,255,0.72)] hover:text-[var(--color-text-primary)]",
                  ].join(" ")}
                >
                  {tab}
                </button>
              ))}
            </div>
          </section>

          <SectionCard
            title="Personal Information"
            description="Keep your contact details up to date so your account remains accurate and reachable."
            fields={copy.personal}
          />

          <SectionCard
            title={variant === "admin" ? "Organization Access" : "Affiliate Details"}
            description={
              variant === "admin"
                ? "Review the organization details and role information currently associated with this account."
                : "Review the affiliate information tied to your profile and public referral presence."
            }
            fields={copy.account}
          />
        </div>

        <div className="space-y-[1.5rem]">
          <section className="rounded-[0.7rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(24,29,48,0.52)] px-[1.4rem] py-[1.35rem]">
            <h3 className="font-[var(--font-display)] text-[1.55rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
              {copy.summaryTitle}
            </h3>
            <div className="mt-[1.15rem] space-y-[0.8rem]">
              {copy.summaryLines.map((line) => (
                <div
                  key={line}
                  className="rounded-[0.6rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(17,21,34,0.96)] px-[1rem] py-[0.85rem] font-[var(--font-sans)] text-[0.95rem] text-[var(--color-text-primary)]"
                >
                  {line}
                </div>
              ))}
            </div>
          </section>

          <SectionCard
            title="Notification Preferences"
            description="Choose how you want to be notified for operational updates and important account activity."
            fields={copy.notifications}
          />
        </div>
      </div>
    </div>
  );
}
