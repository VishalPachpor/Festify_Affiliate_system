"use client";

import { useEffect, useRef, useState } from "react";
import {
  useNotifications,
  useMarkAllNotificationsRead,
} from "@/modules/notifications/hooks/use-notifications";
import type { Notification } from "@/modules/notifications/api/get-notifications";

function IconBell() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5.4 7.8a3.6 3.6 0 017.2 0c0 2.7.9 3.6.9 3.6H4.5s.9-.9.9-3.6z" />
      <path d="M9 14.4a1.8 1.8 0 01-1.8-1.8h3.6A1.8 1.8 0 019 14.4z" />
    </svg>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type Props = {
  recipient: "affiliate" | "tenant";
};

export function NotificationBell({ recipient }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useNotifications(recipient);
  const markAllRead = useMarkAllNotificationsRead(recipient);

  const notifications: Notification[] = data?.notifications ?? [];
  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  // Close on outside click — keeps the dropdown self-contained without
  // pulling in a popover/portal library.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    // Clear the badge when opening — opening = "I've seen them".
    if (next && unreadCount > 0) {
      markAllRead.mutate();
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        className="relative flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-[var(--duration-normal)]"
      >
        <IconBell />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-[0.25rem] -top-[0.2rem] flex h-[0.95rem] min-w-[0.95rem] items-center justify-center rounded-full bg-[var(--color-error)] px-[0.25rem] font-[var(--font-sans)] text-[0.6rem] font-semibold leading-none text-white"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+0.6rem)] z-50 w-[22rem] overflow-hidden rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[#0E0F11] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
        >
          <header className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] px-[var(--space-4)] py-[var(--space-3)]">
            <h2 className="font-[var(--font-display)] text-[0.95rem] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
              Notifications
            </h2>
            <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.50)]">
              {recipient === "affiliate" ? "Your inbox" : "Organizer feed"}
            </span>
          </header>

          <div className="max-h-[24rem] overflow-y-auto">
            {isLoading && (
              <div className="px-[var(--space-4)] py-[var(--space-5)] text-center font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
                Loading…
              </div>
            )}

            {!isLoading && notifications.length === 0 && (
              <div className="px-[var(--space-4)] py-[var(--space-6)] text-center font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.45)]">
                You're all caught up.
              </div>
            )}

            <ul>
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className="border-b border-[rgba(255,255,255,0.05)] px-[var(--space-4)] py-[var(--space-3)] last:border-b-0"
                >
                  <div className="flex items-start gap-[0.6rem]">
                    {n.readAt === null && (
                      <span
                        aria-hidden="true"
                        className="mt-[0.45rem] size-[0.4rem] shrink-0 rounded-full bg-[#5B8DEF]"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                        {n.title}
                      </p>
                      <p className="mt-[0.15rem] font-[var(--font-sans)] text-[var(--text-xs)] leading-[1.1rem] text-[rgba(255,255,255,0.65)]">
                        {n.body}
                      </p>
                      <p className="mt-[0.3rem] font-[var(--font-sans)] text-[0.65rem] uppercase tracking-[0.06em] text-[rgba(255,255,255,0.40)]">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
