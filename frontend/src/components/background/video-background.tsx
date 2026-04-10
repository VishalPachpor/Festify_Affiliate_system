"use client";

/**
 * Full-screen looping video background with a dark overlay so foreground
 * content (auth cards, forms) stays readable. Falls back to the page
 * background color if the video fails to load.
 */
export function VideoBackground({ src }: { src: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[var(--color-page)]">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={src} type="video/mp4" />
      </video>
      {/* Dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/60" />
    </div>
  );
}
