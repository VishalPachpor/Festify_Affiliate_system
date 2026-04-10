"use client";

import { useAuth } from "@/modules/auth";
import { useCurrentAffiliate } from "@/modules/affiliates/hooks/use-current-affiliate";

type ProfileVariant = "admin" | "affiliate";

type Field = {
  label: string;
  value: string;
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

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfilePage({ variant }: { variant: ProfileVariant }) {
  const { user } = useAuth();
  const { data: affiliate } = useCurrentAffiliate();

  const fullName = user?.fullName ?? "User";
  const email = user?.email ?? "—";
  const initials = initialsFor(fullName);
  const referralCode = affiliate?.referralCode ?? user?.affiliateId ?? "—";
  const roleName = variant === "admin" ? "Organizer Admin" : "Affiliate Partner";

  const personalFields: Field[] =
    variant === "admin"
      ? [
          { label: "Full Name", value: fullName },
          { label: "Work Email", value: email },
        ]
      : [
          { label: "Full Name", value: fullName },
          { label: "Email", value: email },
        ];

  const accountFields: Field[] =
    variant === "admin"
      ? [
          { label: "Role", value: "Admin" },
          { label: "Tenant", value: user?.tenantId ?? "—" },
        ]
      : [
          { label: "Affiliate Code", value: referralCode },
          { label: "Payout Email", value: email },
        ];

  const summaryLines =
    variant === "admin"
      ? ["Primary admin", `Tenant: ${user?.tenantId ?? "—"}`]
      : [
          `Code: ${referralCode}`,
          affiliate ? `Sales: ${affiliate.totalSales}` : "No sales yet",
          affiliate
            ? `Commission: $${(affiliate.totalCommissionMinor / 100).toFixed(0)}`
            : "Commission: $0",
        ];

  const notificationFields: Field[] = [
    { label: "New Sale Alerts", value: "Enabled" },
    { label: "Milestone Alerts", value: "Enabled" },
    { label: "Payout Updates", value: "Instant" },
  ];

  return (
    <div className="px-[2rem] py-[1.8rem]">
      <div className="grid gap-[1.5rem] xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-[1.5rem]">
          {/* Header card */}
          <section className="rounded-[0.8rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(24,29,48,0.52)] px-[1.5rem] py-[1.45rem]">
            <div className="flex flex-col gap-[1rem] md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-[1rem]">
                <div className="flex size-[4.25rem] items-center justify-center rounded-full bg-[var(--color-primary)]">
                  <span className="font-[var(--font-sans)] text-[1.1rem] font-semibold text-[var(--color-primary-foreground)]">
                    {initials}
                  </span>
                </div>
                <div>
                  <h2 className="font-[var(--font-display)] text-[2rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
                    {fullName}
                  </h2>
                  <p className="mt-[0.35rem] font-[var(--font-sans)] text-[1rem] leading-[1.5rem] text-[rgba(255,255,255,0.62)]">
                    {roleName}
                  </p>
                </div>
              </div>
            </div>

            <p className="mt-[1rem] max-w-[42rem] font-[var(--font-sans)] text-[1rem] leading-[1.55rem] text-[rgba(255,255,255,0.58)]">
              {variant === "admin"
                ? "Manage your account identity, contact information, and notification preferences."
                : "Manage your public profile, payout contact details, and notification settings."}
            </p>
          </section>

          <SectionCard
            title="Personal Information"
            description="Keep your contact details up to date so your account remains accurate and reachable."
            fields={personalFields}
          />

          <SectionCard
            title={variant === "admin" ? "Account Details" : "Affiliate Details"}
            description={
              variant === "admin"
                ? "Review the organization details and role information associated with this account."
                : "Review the affiliate information tied to your profile and public referral presence."
            }
            fields={accountFields}
          />
        </div>

        <div className="space-y-[1.5rem]">
          <section className="rounded-[0.7rem] border border-[rgba(255,255,255,0.08)] bg-[rgba(24,29,48,0.52)] px-[1.4rem] py-[1.35rem]">
            <h3 className="font-[var(--font-display)] text-[1.55rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
              {variant === "admin" ? "Account Summary" : "Affiliate Summary"}
            </h3>
            <div className="mt-[1.15rem] space-y-[0.8rem]">
              {summaryLines.map((line) => (
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
            fields={notificationFields}
          />
        </div>
      </div>
    </div>
  );
}
