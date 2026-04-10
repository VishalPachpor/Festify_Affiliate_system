import type { Metadata } from "next";
import { VideoBackground } from "@/components/background/video-background";

export const metadata: Metadata = {
  robots: { index: false },
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative min-h-screen overflow-y-auto px-[var(--space-4)]">
      <VideoBackground src="/background.mp4" />
      <div className="relative z-10 flex min-h-screen w-full items-start justify-center pt-[clamp(3rem,10vh,7rem)] pb-[var(--space-6)]">
        {children}
      </div>
    </div>
  );
}
