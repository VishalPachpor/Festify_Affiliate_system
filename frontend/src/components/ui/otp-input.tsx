"use client";

import {
  useRef,
  useCallback,
  type ClipboardEvent,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";

const DIGIT_COUNT = 6;

export type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function OtpInput({
  value,
  onChange,
  error,
  disabled,
  id,
  ...ariaProps
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const digits = value.padEnd(DIGIT_COUNT, "").slice(0, DIGIT_COUNT).split("");

  const focusIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, DIGIT_COUNT - 1));
    inputRefs.current[clamped]?.focus();
  }, []);

  const updateDigit = useCallback(
    (index: number, digit: string) => {
      const next = [...digits];
      next[index] = digit;
      onChange(next.join("").replace(/[^0-9]/g, ""));
    },
    [digits, onChange],
  );

  const handleChange = useCallback(
    (index: number) => (e: ChangeEvent<HTMLInputElement>) => {
      const char = e.target.value.slice(-1);
      if (!/^\d$/.test(char)) return;

      updateDigit(index, char);

      if (index < DIGIT_COUNT - 1) {
        focusIndex(index + 1);
      }
    },
    [updateDigit, focusIndex],
  );

  const handleKeyDown = useCallback(
    (index: number) => (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        if (digits[index]) {
          updateDigit(index, "");
        } else if (index > 0) {
          updateDigit(index - 1, "");
          focusIndex(index - 1);
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        focusIndex(index - 1);
      } else if (e.key === "ArrowRight" && index < DIGIT_COUNT - 1) {
        e.preventDefault();
        focusIndex(index + 1);
      }
    },
    [digits, updateDigit, focusIndex],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/[^0-9]/g, "")
        .slice(0, DIGIT_COUNT);

      if (pasted.length > 0) {
        onChange(pasted);
        focusIndex(Math.min(pasted.length, DIGIT_COUNT - 1));
      }
    },
    [onChange, focusIndex],
  );

  return (
    <div
      style={{ display: "flex", justifyContent: "center", gap: "0.75rem" }}
      role="group"
      aria-label="Verification code"
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          value={digit}
          disabled={disabled}
          onChange={handleChange(index)}
          onKeyDown={handleKeyDown(index)}
          onPaste={index === 0 ? handlePaste : undefined}
          onFocus={(e) => e.target.select()}
          style={{
            width: "3.5rem",
            height: "3.5rem",
            flexShrink: 0,
            borderRadius: "0.5rem",
            border: `1px solid ${error ? "#ef4444" : "rgba(255, 255, 255, 0.20)"}`,
            background: "#121626",
            fontFamily: "var(--font-sans)",
            fontSize: "1.4rem",
            fontWeight: 600,
            textAlign: "center" as const,
            color: "#F0F0F0",
            outline: "none",
            transition: "border-color 200ms",
          }}
          {...(index === 0 ? { id, ...ariaProps } : {})}
        />
      ))}
    </div>
  );
}
