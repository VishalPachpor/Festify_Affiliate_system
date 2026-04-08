import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Attribution Insights — Festify Affiliates",
};

export default function AttributionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
