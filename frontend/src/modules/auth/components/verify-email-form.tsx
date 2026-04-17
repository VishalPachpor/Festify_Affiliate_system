"use client";

import Link from "next/link";
import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useVerifyEmailMutation } from "../hooks/use-verify-email";
import { useResendCodeMutation } from "../hooks/use-resend-code";
import { verifyEmailSchema } from "../schemas";

export function VerifyEmailForm({
  email,
  initialCode = "",
}: {
  email: string;
  initialCode?: string;
}) {
  const [code, setCode] = useState(initialCode);
  const [error, setError] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);

  // Dev-mode auto-fill: if the signup redirect carried a ?code=, seed it
  // after mount. Using an effect (not just useState initial value) so the
  // Suspense boundary's search-param read stays stable across re-renders.
  useEffect(() => {
    if (initialCode && initialCode !== code) setCode(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);

  const verifyMutation = useVerifyEmailMutation();
  const resendMutation = useResendCodeMutation();

  const isSubmitting = verifyMutation.isPending;

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setSubmitted(true);
      setError(undefined);

      const result = verifyEmailSchema.safeParse({ code });
      if (!result.success) {
        setError(result.error.issues[0]?.message ?? "Invalid code");
        return;
      }

      try {
        await verifyMutation.mutateAsync({ email, code: result.data.code });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Verification failed",
        );
      }
    },
    [code, email, verifyMutation],
  );

  const handleResend = useCallback(async () => {
    try {
      const res = await resendMutation.mutateAsync(email);
      // Dev-only: if the backend returned the fresh code because no email
      // provider is configured, drop it straight into the input.
      if (res?.devVerificationCode) {
        setCode(res.devVerificationCode);
        setError(undefined);
      }
    } catch {
      // Silently fail — don't reveal whether email exists
    }
  }, [email, resendMutation]);

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-[var(--space-6)]">
      <div className="flex flex-col gap-[var(--space-3)]">
        <label htmlFor="verification-code" className="sr-only">
          Verification Code
        </label>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}>
          {Array.from({ length: 6 }).map((_, i) => {
            const char = code[i] ?? "";
            return (
              <input
                key={i}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={char}
                disabled={isSubmitting}
                onChange={(e) => {
                  const val = e.target.value.slice(-1);
                  if (val && !/^\d$/.test(val)) return;
                  const next = code.split("");
                  next[i] = val;
                  const joined = next.join("").replace(/[^0-9]/g, "");
                  setCode(joined);
                  setError(undefined);
                  if (val && i < 5) {
                    const nextInput = e.target.parentElement?.children[i + 1] as HTMLInputElement | undefined;
                    nextInput?.focus();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !char && i > 0) {
                    const prevInput = (e.target as HTMLElement).parentElement?.children[i - 1] as HTMLInputElement | undefined;
                    prevInput?.focus();
                  }
                }}
                style={{
                  width: "3.5rem",
                  height: "3.5rem",
                  borderRadius: "0.5rem",
                  border: `1.5px solid ${error && submitted ? "#ef4444" : "rgba(255, 255, 255, 0.10)"}`,
                  background: "#121626",
                  fontSize: "1.4rem",
                  fontWeight: 600,
                  textAlign: "center",
                  color: "#F0F0F0",
                  outline: "none",
                }}
              />
            );
          })}
        </div>
        {error && submitted && (
          <p
            id="verification-code-error"
            className="text-center font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-error)]"
            role="alert"
            aria-live="assertive"
          >
            {error}
          </p>
        )}
      </div>

      <p className="text-center font-[var(--font-sans)] text-[var(--text-base)] text-[var(--color-text-link)]">
        Didn&apos;t receive code?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={resendMutation.isPending}
          className="underline transition-colors hover:text-[var(--color-text-link-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {resendMutation.isPending
            ? "Sending..."
            : resendMutation.isSuccess
              ? "Resent"
              : "Resend"}
        </button>
      </p>

      <Button
        type="submit"
        variant="primary"
        loading={isSubmitting}
        className="w-full"
      >
        Verify &amp; Continue
      </Button>

      <Link
        href={email ? `/sign-up?email=${encodeURIComponent(email)}` : "/sign-up"}
        className="text-center font-[var(--font-sans)] text-[var(--text-base)] text-[var(--color-text-link)] underline transition-colors hover:text-[var(--color-text-link-hover)]"
      >
        Change email address
      </Link>
    </form>
  );
}
