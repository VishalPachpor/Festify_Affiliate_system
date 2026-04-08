"use client";

const MATERIAL_ITEMS = [
  {
    id: "material-1",
    title: "Event Hero Banner",
    meta: "Image · 2048x1024",
  },
  {
    id: "material-2",
    title: "Speaker Lineup Poster",
    meta: "Image · 1080x1920",
  },
  {
    id: "material-3",
    title: "Social Media Kit",
    meta: "ZIP · 2.4MB",
  },
] as const;

function IconFile() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 2H5.5A1.5 1.5 0 004 3.5v11A1.5 1.5 0 005.5 16h7a1.5 1.5 0 001.5-1.5V6z" />
      <path d="M11 2v4h4" />
      <path d="M7 9.25h4M7 12h4" />
    </svg>
  );
}

export function RecentMaterials() {
  return (
    <section
      aria-label="Recent materials"
      className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]"
    >
      <h2 className="font-[var(--font-display)] text-[2rem] font-bold leading-none tracking-[-0.04em] text-[var(--color-text-primary)]">
        Recent Materials
      </h2>

      <div className="mt-[0.9rem] divide-y divide-[var(--color-border)]">
        {MATERIAL_ITEMS.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-[0.95rem] py-[0.95rem]"
          >
            <div className="flex size-[2.35rem] shrink-0 items-center justify-center rounded-[calc(var(--radius)+0.125rem)] bg-[rgba(var(--color-primary-rgb),0.22)] text-[var(--color-text-white)]">
              <IconFile />
            </div>
            <div className="min-w-0">
              <p className="truncate font-[var(--font-sans)] text-[1rem] leading-[1.25rem] text-[var(--color-text-primary)]">
                {item.title}
              </p>
              <p className="mt-[0.05rem] font-[var(--font-sans)] text-[0.84rem] leading-[1.05rem] text-[var(--color-text-secondary)]">
                {item.meta}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
