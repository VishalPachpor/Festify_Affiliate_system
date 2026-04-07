"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AuthSignUpForm() {
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // TODO: connect to backend
    setTimeout(() => setLoading(false), 1500);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--space-md)]">
      <Input required>
        <Input.Label>Full Name</Input.Label>
        <Input.Field
          type="text"
          placeholder="John Doe"
          autoComplete="name"
        />
      </Input>

      <Input required>
        <Input.Label>Email</Input.Label>
        <Input.Field
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </Input>

      <Input required>
        <Input.Label>Password</Input.Label>
        <Input.Field
          type="password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
        />
      </Input>

      <Input required>
        <Input.Label>Confirm Password</Input.Label>
        <Input.Field
          type="password"
          placeholder="Re-enter password"
          autoComplete="new-password"
        />
      </Input>

      <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-[var(--space-xs)]">
        Create Account
      </Button>
    </form>
  );
}
