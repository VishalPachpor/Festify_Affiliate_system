import type { Metadata } from "next";
import { AuthCard } from "@/modules/auth/components/auth-card";
import { OrganizerSignUpForm } from "@/modules/auth/components/organizer-signup-form";

export const metadata: Metadata = {
  title: "Start as Organizer — Passtrack Marketing Partners",
  description: "Create your event and start managing marketing partners",
};

export default function OrganizerSignUpPage() {
  return (
    <AuthCard
      title="Start as Organizer"
      subtitle="Create your event and start recruiting marketing partners."
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
