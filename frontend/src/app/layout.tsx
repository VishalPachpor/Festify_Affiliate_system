import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import { resolveTenant } from "@/modules/tenant-shell";
import "@/styles/globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Festify Affiliates",
  description: "Multi-tenant affiliate attribution platform for event organizers",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const hostname = headersList.get("host") ?? "localhost";
  const tenant = await resolveTenant(hostname);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppProviders tenant={tenant}>
          <div className="min-h-screen bg-[var(--color-page)] text-[var(--color-text-primary)]">
            {children}
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
