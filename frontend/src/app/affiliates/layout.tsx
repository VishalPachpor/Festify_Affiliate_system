import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Marketing Partners — Passtrack Marketing Partners",
};

export default function AffiliatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
