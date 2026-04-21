"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const TWITTER_HANDLE = "token2049";
const WIDGETS_SRC = "https://platform.twitter.com/widgets.js";
const LOAD_TIMEOUT_MS = 6000;

// X's widgets.js is loaded via next/script (afterInteractive so it fires
// right after hydration, not idle). Once the twttr global shows up we
// call widgets.load() on our ref — that replaces the `.twitter-timeline`
// anchor with X's iframe.
//
// The widget has three failure modes we can't code around:
//   1. widgets.js blocked (adblocker, tracker blocker, strict CSP)
//   2. widgets.js loads but X returns an empty iframe for anonymous
//      embeds (X has been aggressive about this since 2023)
//   3. Network / 3rd-party cookies disabled
// If nothing has rendered a .twitter-tweet / iframe inside our ref
// within LOAD_TIMEOUT_MS we surface a fallback link so the section
// isn't just a blank card.
type TwttrWidgets = { load: (el?: HTMLElement) => void };
type TwttrGlobal = { widgets: TwttrWidgets };

declare global {
  interface Window {
    twttr?: TwttrGlobal;
  }
}

export function TwitterFeed() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "rendered" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;

    // Poll for twttr.widgets up to the timeout, then call load().
    const pollStart = Date.now();
    const poll = window.setInterval(() => {
      if (cancelled) return;
      if (Date.now() - pollStart > LOAD_TIMEOUT_MS) {
        window.clearInterval(poll);
        setStatus((s) => (s === "rendered" ? s : "failed"));
        return;
      }
      if (window.twttr?.widgets && containerRef.current) {
        window.clearInterval(poll);
        window.twttr.widgets.load(containerRef.current);
      }
    }, 150);

    // Watch the container — once the widget injects an iframe, flip to
    // rendered. If we never see one by the timeout, flip to failed.
    const observer = new MutationObserver(() => {
      if (!containerRef.current) return;
      if (containerRef.current.querySelector("iframe")) {
        if (!cancelled) setStatus("rendered");
        observer.disconnect();
      }
    });
    if (containerRef.current) {
      observer.observe(containerRef.current, { childList: true, subtree: true });
    }

    const timeout = window.setTimeout(() => {
      if (cancelled) return;
      setStatus((s) => (s === "rendered" ? s : "failed"));
    }, LOAD_TIMEOUT_MS);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  return (
    <section
      aria-label={`@${TWITTER_HANDLE} on X`}
      className="overflow-hidden rounded-[8px] p-[24px]"
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%), rgba(21,26,43,0.5)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 8px 24px rgba(0,0,0,0.2)",
      }}
    >
      <div className="flex items-baseline justify-between border-b border-[rgba(255,255,255,0.1)] pb-[24px]">
        <h2 className="font-[var(--font-display)] text-[18px] font-medium leading-[20px] tracking-[-0.2px] text-[#F0F0F0]">
          Latest from @{TWITTER_HANDLE}
        </h2>
        <a
          href={`https://twitter.com/${TWITTER_HANDLE}`}
          target="_blank"
          rel="noreferrer"
          className="font-[var(--font-sans)] text-[12px] leading-[18px] text-[#A6D1FF] hover:underline"
        >
          Open on X →
        </a>
      </div>

      <div ref={containerRef} className="pt-[16px]">
        {/* The anchor is what widgets.js scans for and replaces. Keep
            it visible so users have a link even while the script
            loads. */}
        <a
          className="twitter-timeline"
          data-theme="dark"
          data-chrome="noheader nofooter transparent"
          data-height="600"
          href={`https://twitter.com/${TWITTER_HANDLE}`}
        >
          Tweets by @{TWITTER_HANDLE}
        </a>
        {status === "failed" ? (
          <div
            className="mt-[12px] rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-[16px] font-[var(--font-sans)] text-[13px] leading-[20px] text-[rgba(255,255,255,0.65)]"
            role="status"
          >
            The embedded timeline couldn&apos;t load — this often happens
            when a tracker blocker or strict network blocks
            platform.twitter.com. Use the{" "}
            <a
              href={`https://twitter.com/${TWITTER_HANDLE}`}
              target="_blank"
              rel="noreferrer"
              className="text-[#A6D1FF] hover:underline"
            >
              Open on X
            </a>{" "}
            link above to view posts directly.
          </div>
        ) : null}
      </div>

      <Script
        src={WIDGETS_SRC}
        strategy="afterInteractive"
        onError={() => setStatus("failed")}
      />
    </section>
  );
}
