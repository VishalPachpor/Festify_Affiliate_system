import { type Page, expect } from "@playwright/test";

// Demo credentials come from backend/prisma/seed.ts. If you rotate them in
// the seed, rotate them here too.
export const ADMIN = {
  email: "admin@festify.io",
  password: "Password123!",
};

export const AFFILIATE = {
  email: "alex@festify.io",
  password: "Password123!",
};

type Creds = { email: string; password: string };

/** Signs in via the /sign-in form and waits for the post-login redirect. */
export async function login(page: Page, creds: Creds): Promise<void> {
  await page.goto("/sign-in");

  // Form fields — match by accessible name, not raw selectors, so a CSS
  // refactor doesn't silently break the suite.
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Post-login destination depends on role; just wait for the sidebar shell
  // to show up since both sides render it.
  await expect(page.getByRole("navigation")).toBeVisible({ timeout: 15_000 });
}

/**
 * Waits for the tanstack-query network to settle, fonts to load, and any
 * CSS animations to finish. Critical for stable screenshots.
 */
export async function waitForIdle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  // Extra tick so react-query cache writes + tailwind transitions settle.
  await page.waitForTimeout(400);
}

/**
 * Hides elements that change between runs (timestamps, avatar initials with
 * random seed, realtime badges). Keeps the screenshot diffable.
 */
export async function maskFlakyBits(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      /* Relative timestamps ("2 hours ago") rotate every minute */
      [data-testid="timestamp"], [data-flaky="timestamp"] { visibility: hidden !important; }

      /* Notification dot shows up when websocket has new events */
      [aria-label="Notifications"] span { visibility: hidden !important; }

      /* Disable ALL transitions/animations globally — belt-and-braces on
         top of Playwright's animations:disabled option. */
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
    `,
  });
}
