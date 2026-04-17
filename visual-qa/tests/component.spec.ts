import { test, expect } from "@playwright/test";
import { login, ADMIN } from "./helpers/auth";
import { component } from "./helpers/snapshot";

// Cross-cutting component snapshots — buttons, inputs, badges — captured from
// real pages so they reflect the actual token values Vercel is serving.

test.beforeEach(async ({ page }) => {
  await login(page, ADMIN);
});

test.describe("Buttons", () => {
  test("primary button — default / hover / active / focus", async ({ page }) => {
    await page.goto("/admin/affiliates");
    const btn = page.getByRole("button", { name: /invite affiliate/i });
    await expect(btn).toBeVisible();

    await component(btn, "btn-primary-default.png");
    await component(btn, "btn-primary-hover.png", { hover: btn });
    await component(btn, "btn-primary-focus.png", { focus: btn });
    await component(btn, "btn-primary-active.png", { pressAndHold: btn });
  });

  test("ghost / secondary button — default + hover", async ({ page }) => {
    await page.goto("/admin/commissions");
    const exportBtn = page.getByRole("button", { name: /export csv/i });
    if (await exportBtn.isVisible().catch(() => false)) {
      await component(exportBtn, "btn-ghost-default.png");
      await component(exportBtn, "btn-ghost-hover.png", { hover: exportBtn });
    }
  });
});

test.describe("Inputs", () => {
  test("search input — default / focus", async ({ page }) => {
    await page.goto("/admin/affiliates");
    const search = page.getByPlaceholder(/search affiliates/i);
    await component(search, "input-search-default.png");
    await component(search, "input-search-focus.png", { focus: search });
  });

  test("text input — focus ring", async ({ page }) => {
    await page.goto("/admin/milestones");
    const input = page.locator('input[id^="threshold-"]').first();
    await component(input, "input-text-default.png");
    await component(input, "input-text-focus.png", { focus: input });
  });
});

test.describe("Status badges", () => {
  test("tier + status pills on affiliates table", async ({ page }) => {
    await page.goto("/admin/affiliates");
    // First-row status + tier cells for token-level diff.
    const firstRow = page.getByRole("row").nth(1);
    const tierCell = firstRow.getByRole("cell").nth(2);
    const statusCell = firstRow.getByRole("cell").nth(6);
    await component(tierCell, "badge-tier.png");
    await component(statusCell, "badge-status.png");
  });

  test("commission status pill — pending + paid", async ({ page }) => {
    await page.goto("/admin/commissions");
    const pending = page.getByText(/^pending$/i).first();
    if (await pending.isVisible().catch(() => false)) {
      await component(pending, "badge-commission-pending.png");
    }
    const paid = page.getByText(/^paid$/i).first();
    if (await paid.isVisible().catch(() => false)) {
      await component(paid, "badge-commission-paid.png");
    }
  });
});

test.describe("Tables", () => {
  test("admin commissions table row", async ({ page }) => {
    await page.goto("/admin/commissions");
    const row = page.getByRole("row").nth(1);
    await component(row, "table-commissions-row.png");
  });
});

test.describe("Cards", () => {
  test("KPI card (admin commissions Outstanding)", async ({ page }) => {
    await page.goto("/admin/commissions");
    // Outstanding card is the blue-labeled one — grab by label text.
    const card = page.getByText(/^outstanding$/i).locator("..").locator("..");
    await component(card, "card-kpi-outstanding.png");
  });
});
