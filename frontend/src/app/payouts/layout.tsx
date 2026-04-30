import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payouts — Passtrack Marketing Partners",
};

export default function PayoutsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
