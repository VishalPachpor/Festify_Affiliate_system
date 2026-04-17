import { defineConfig, devices } from "@playwright/test";

// Override at runtime with: BASE_URL=… npm test
const BASE_URL = process.env.BASE_URL ?? "https://frontend-one-sepia-69.vercel.app";

export default defineConfig({
  testDir: "./tests",

  // Strict pixel parity. First run seeds snapshots; subsequent runs fail on
  // any change above the threshold. Raise maxDiffPixelRatio if you want a
  // more lenient gate.
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01, // 1% of pixels may differ
      threshold: 0.2,          // per-pixel tolerance (0..1, lower = stricter)
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },

  // Snapshot folder lives next to each spec: tests/<spec>.ts-snapshots/<name>.png
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}",

  fullyParallel: false, // serial runs keep auth/session state stable
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Deterministic 1440-width viewport to match the Figma canvas.
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    // Force the in-app locale/timezone/fonts so screenshots are reproducible.
    locale: "en-US",
    timezoneId: "Asia/Singapore",
    colorScheme: "dark",
  },

  projects: [
    {
      name: "chromium-1440",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
});
