import { test, expect } from "@playwright/test";
import { login, AFFILIATE } from "./helpers/auth";
import { fullPage, component } from "./helpers/snapshot";

// Affiliate-side screens. One sign-in per spec file keeps the session hot.
test.beforeEach(async ({ page }) => {
  await login(page, AFFILIATE);
});

test.describe("Affiliate Dashboard", () => {
  test("renders dashboard at pixel parity", async ({ page }) => {
    await page.goto("/dashboard");
    await fullPage(page, "dashboard.png");
  });

  test("KPI cards — component snapshot", async ({ page }) => {
    await page.goto("/dashboard");
    // Scope to the KPI grid — avoids background noise from the page shell.
    const kpi = page.locator('[data-testid="kpi-grid"], [aria-label="Key metrics"]').first();
    await component(kpi, "dashboard-kpi.png");
  });
});

test.describe("Affiliate Materials", () => {
  test("materials grid renders at pixel parity", async ({ page }) => {
    await page.goto("/dashboard/materials");
    await fullPage(page, "materials.png");
  });

  test("single material card — default state", async ({ page }) => {
    await page.goto("/dashboard/materials");
    const card = page.locator("article").first();
    await expect(card).toBeVisible();
    await component(card, "material-card-default.png");
  });

  test("single material card — hover", async ({ page }) => {
    await page.goto("/dashboard/materials");
    const card = page.locator("article").first();
    await component(card, "material-card-hover.png", { hover: card });
  });

  test("download button — focus state", async ({ page }) => {
    await page.goto("/dashboard/materials");
    const downloadBtn = page.getByRole("link", { name: /download/i }).first();
    await component(downloadBtn, "material-download-focus.png", {
      focus: downloadBtn,
    });
  });

  test("filter tabs — default + selected", async ({ page }) => {
    await page.goto("/dashboard/materials");
    const tabBar = page.getByRole("tablist", { name: /filter materials/i });
    await component(tabBar, "material-tabs-default.png");

    // Click the "Banners" tab and capture the selected state.
    await page.getByRole("tab", { name: /banners/i }).click();
    await component(tabBar, "material-tabs-banners-selected.png");
  });
});

test.describe("Affiliate Milestones", () => {
  test("milestones page renders at pixel parity", async ({ page }) => {
    // Affiliate-side milestone view is under /dashboard — this matches the
    // live routing; update the URL if the route ever moves.
    await page.goto("/dashboard/milestones");
    await fullPage(page, "milestones.png");
  });

  test("single milestone row — read state", async ({ page }) => {
    await page.goto("/dashboard/milestones");
    const row = page.locator("article").first();
    if (await row.isVisible().catch(() => false)) {
      await component(row, "milestone-row-default.png");
    } else {
      test.skip(true, "No milestone rows rendered for this affiliate");
    }
  });
});
