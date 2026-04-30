import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Attribution Insights — Passtrack Marketing Partners",
};

export default function AttributionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
