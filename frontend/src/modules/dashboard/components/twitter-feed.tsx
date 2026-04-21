"use client";

import { useEffect, useRef } from "react";

const TWITTER_HANDLE = "token2049";
const WIDGETS_SRC = "https://platform.twitter.com/widgets.js";

// X's widgets.js attaches itself to window as `twttr` and exposes a
// `widgets.load(el?)` method that scans the subtree for `.twitter-timeline`
// anchors and replaces them with iframes. We load the script once globally
// and then trigger a per-mount load() so this works under Next.js client
// navigation (the script tag won't re-fire on subsequent route changes).
type TwttrWidgets = { load: (el?: HTMLElement) => void };
type TwttrGlobal = { widgets: TwttrWidgets };

declare global {
  interface Window {
    twttr?: TwttrGlobal;
  }
}

function loadWidgetsScript(): Promise<TwttrGlobal> {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.twttr) return Promise.resolve(window.twttr);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${WIDGETS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        if (window.twttr) resolve(window.twttr);
        else reject(new Error("twttr global missing after script load"));
      });
      existing.addEventListener("error", () => reject(new Error("widgets.js failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.src = WIDGETS_SRC;
    script.async = true;
    script.charset = "utf-8";
    script.addEventListener("load", () => {
      if (window.twttr) resolve(window.twttr);
      else reject(new Error("twttr global missing after script load"));
    });
    script.addEventListener("error", () => reject(new Error("widgets.js failed to load")));
    document.body.appendChild(script);
  });
}

export function TwitterFeed() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadWidgetsScript()
      .then((twttr) => {
        if (cancelled || !containerRef.current) return;
        twttr.widgets.load(containerRef.current);
      })
      .catch((err) => {
        // Non-fatal — the anchor stays as a plain link so users can still
        // click through to the X profile. Log so we notice if X breaks the
        // widget script (which has happened historically).
        console.warn("[TwitterFeed] widgets.js load failed:", err);
      });
    return () => {
      cancelled = true;
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
      <div className="border-b border-[rgba(255,255,255,0.1)] pb-[24px]">
        <h2 className="font-[var(--font-display)] text-[18px] font-medium leading-[20px] tracking-[-0.2px] text-[#F0F0F0]">
          Latest from @{TWITTER_HANDLE}
        </h2>
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
      </div>
    </section>
  );
}
