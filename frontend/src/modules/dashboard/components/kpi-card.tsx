type KpiCardProps = {
  label: string;
  value: string;
  changePct?: number;
  changeLabel?: string;
  accentColor: string;
  isLoading?: boolean;
};

// Figma trend icon (53:1747) — 16px, green upward arrow
function IconTrend() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 12L6 7L9 10L14 4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 4H14V8" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCardSkeleton({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={`Loading ${label}`}
      aria-busy="true"
      className="flex flex-col gap-[8px] rounded-[8px] p-[24px]"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%), rgba(21,26,43,0.8)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      <div className="h-[4px] w-[64px] animate-pulse rounded-[50px] bg-[rgba(255,255,255,0.08)]" />
      <div className="h-[16px] w-[80px] animate-pulse rounded-[4px] bg-[rgba(255,255,255,0.08)]" />
      <div className="h-[28px] w-[100px] animate-pulse rounded-[4px] bg-[rgba(255,255,255,0.08)]" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

export function KpiCard({
  label,
  value,
  changePct,
  changeLabel,
  accentColor,
  isLoading,
}: KpiCardProps) {
  if (isLoading) return <KpiCardSkeleton label={label} />;

  const delta = changeLabel
    ?? (changePct !== undefined ? `+${changePct.toFixed(1)}%` : null);

  return (
    <dl
      className="flex flex-col gap-[8px] rounded-[8px] p-[24px]"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%), rgba(21,26,43,0.8)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.3)",
      }}
    >
      {/* Accent bar — 64×4 rounded pill */}
      <span
        aria-hidden="true"
        className="h-[4px] w-[64px] rounded-[50px]"
        style={{ background: accentColor }}
      />

      {/* Label — 12px uppercase, tracking 0.5px, #A6D1FF, leading 16px */}
      <dt className="font-[var(--font-sans)] text-[12px] leading-[16px] tracking-[0.5px] uppercase text-[#A6D1FF]">
        {label}
      </dt>

      {/* Value — Bold 28px, #F0F0F0, leading 42px */}
      <dd className="font-[var(--font-sans)] text-[28px] font-bold leading-[42px] text-[#F0F0F0]">
        {value}
      </dd>

      {/* Change indicator — 12px, #22C55E, leading 18px, with trend icon */}
      {delta ? (
        <dd className="flex items-center gap-[4px] font-[var(--font-sans)] text-[12px] leading-[18px] text-[#22C55E]">
          <IconTrend />
          {delta}
        </dd>
      ) : (
        <dd aria-hidden="true" className="min-h-[18px]" />
      )}
    </dl>
  );
}
