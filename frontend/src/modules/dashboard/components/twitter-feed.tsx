"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const TWITTER_HANDLE = "token2049";
const WIDGETS_SRC = "https://platform.twitter.com/widgets.js";

// X's widgets.js exposes window.twttr.widgets.load(el?) which scans the
// subtree for `.twitter-timeline` anchors and replaces them with iframes.
// Loading is delegated to next/script so Next handles dedup + strategy —
// we just trigger widgets.load() on our ref once the script is ready.
type TwttrWidgets = { load: (el?: HTMLElement) => void };
type TwttrGlobal = { widgets: TwttrWidgets };

declare global {
  interface Window {
    twttr?: TwttrGlobal;
  }
}

export function TwitterFeed() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // If widgets.js was already loaded by a prior mount, skip the wait.
  useEffect(() => {
    if (typeof window !== "undefined" && window.twttr?.widgets) {
      setScriptReady(true);
    }
  }, []);

  // Once the script is ready AND the container is mounted, ask twttr to
  // replace the anchor with an iframe.
  useEffect(() => {
    if (!scriptReady) return;
    if (!containerRef.current) return;
    window.twttr?.widgets.load(containerRef.current);
  }, [scriptReady]);

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
        <a
          className="twitter-timeline"
          data-theme="dark"
          data-chrome="noheader nofooter transparent"
          data-height="600"
          href={`https://twitter.com/${TWITTER_HANDLE}`}
        >
          Tweets by @{TWITTER_HANDLE}
        </a>
        {loadFailed ? (
          <p className="mt-[12px] font-[var(--font-sans)] text-[12px] leading-[18px] text-[rgba(255,255,255,0.55)]">
            Timeline couldn&apos;t load. Click &quot;Open on X&quot; above to view posts.
          </p>
        ) : null}
      </div>

      <Script
        src={WIDGETS_SRC}
        strategy="lazyOnload"
        onReady={() => setScriptReady(true)}
        onError={() => setLoadFailed(true)}
      />
    </section>
  );
}
