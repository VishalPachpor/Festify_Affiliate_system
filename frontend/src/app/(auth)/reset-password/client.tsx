"use client";

import { useSearchParams } from "next/navigation";
import { ForgotPasswordForm } from "@/modules/auth/components/forgot-password-form";
import { ResetPasswordForm } from "@/modules/auth/components/reset-password-form";

/**
 * If the URL has ?token=… show the reset form (set new password).
 * Otherwise show the forgot-password form (enter email to get link).
 */
export function ResetPasswordClient() {
  const searchParams = useSearchParams();
  const hasToken = !!searchParams?.get("token");

  return hasToken ? <ResetPasswordForm /> : <ForgotPasswordForm />;
}
