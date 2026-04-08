import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payouts — Festify Affiliates",
};

export default function PayoutsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
