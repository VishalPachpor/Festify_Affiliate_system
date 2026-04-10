import type { Metadata } from "next";
import { AuthCard } from "@/modules/auth/components/auth-card";
import { OrganizerSignUpForm } from "@/modules/auth/components/organizer-signup-form";

export const metadata: Metadata = {
  title: "Start as Organizer — Festify Affiliates",
  description: "Create your event and start managing affiliates",
};

export default function OrganizerSignUpPage() {
  return (
    <AuthCard
      title="Start as Organizer"
      subtitle="Create your event and start recruiting affiliates."
      footerText="Already have an account?"
      footerLinkText="Log in"
      footerLinkHref="/sign-in"
      showGoogle={false}
      showTabs={false}
    >
      <OrganizerSignUpForm />
    </AuthCard>
  );
}
