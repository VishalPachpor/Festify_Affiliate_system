import { test, expect } from "@playwright/test";
import { login, ADMIN } from "./helpers/auth";
import { fullPage, component } from "./helpers/snapshot";

test.beforeEach(async ({ page }) => {
  await login(page, ADMIN);
});

test.describe("Admin Dashboard", () => {
  test("renders at pixel parity", async ({ page }) => {
    await page.goto("/admin");
    await fullPage(page, "admin-dashboard.png");
  });

  test("KPI summary row — component snapshot", async ({ page }) => {
    await page.goto("/admin");
    const kpi = page.locator("dl").first(); // KPI cards live inside a <dl>
    if (await kpi.isVisible().catch(() => false)) {
      await component(kpi, "admin-dashboard-kpi.png");
    }
  });
});

test.describe("Admin Affiliates", () => {
  test("affiliates table — full page", async ({ page }) => {
    await page.goto("/admin/affiliates");
    await fullPage(page, "admin-affiliates.png");
  });

  test("affiliates table — table only", async ({ page }) => {
    await page.goto("/admin/affiliates");
    const table = page.getByRole("table", { name: /affiliates/i });
    await component(table, "admin-affiliates-table.png");
  });

  test("row hover state", async ({ page }) => {
    await page.goto("/admin/affiliates");
    const firstRow = page.getByRole("row").nth(1); // nth(0) is the header
    await component(firstRow, "admin-affiliates-row-hover.png", {
      hover: firstRow,
    });
  });

  test("affiliate drawer — opens on row click", async ({ page }) => {
    await page.goto("/admin/affiliates");
    const firstRow = page.getByRole("row").nth(1);
    // Click the view-eye button if present, otherwise click the row.
    const viewBtn = firstRow.getByRole("button", { name: /view/i });
    if (await viewBtn.isVisible().catch(() => false)) {
      await viewBtn.click();
    } else {
      await firstRow.click();
    }
    const drawer = page.getByRole("dialog", { name: /affiliate details/i });
    await expect(drawer).toBeVisible();
    await component(drawer, "admin-affiliates-drawer.png");
  });
});

test.describe("Admin Commissions", () => {
  test("commissions page — full page", async ({ page }) => {
    await page.goto("/admin/commissions");
    await fullPage(page, "admin-commissions.png");
  });

  test("commissions KPI cards", async ({ page }) => {
    await page.goto("/admin/commissions");
    const kpi = page.locator("dl").first();
    await component(kpi, "admin-commissions-kpi.png");
  });

  test("Mark Paid button — default + hover", async ({ page }) => {
    await page.goto("/admin/commissions");
    const btn = page.getByRole("button", { name: /mark paid/i }).first();
    if (await btn.isVisible().catch(() => false)) {
      await component(btn, "admin-commissions-mark-paid-default.png");
      await component(btn, "admin-commissions-mark-paid-hover.png", {
        hover: btn,
      });
    } else {
      test.skip(true, "No approved commissions available for snapshot");
    }
  });
});

test.describe("Admin Materials", () => {
  test("materials grid — full page", async ({ page }) => {
    await page.goto("/admin/materials");
    await fullPage(page, "admin-materials.png");
  });

  test("single material card", async ({ page }) => {
    await page.goto("/admin/materials");
    const card = page.locator("article").first();
    await component(card, "admin-material-card.png");
  });

  test("upload modal — opens and renders", async ({ page }) => {
    await page.goto("/admin/materials");
    await page.getByRole("button", { name: /upload asset/i }).click();
    const modal = page.getByRole("dialog", { name: /upload asset/i });
    await expect(modal).toBeVisible();
    await component(modal, "admin-material-upload-modal.png");
  });
});

test.describe("Admin Milestones", () => {
  test("milestones list — full page", async ({ page }) => {
    await page.goto("/admin/milestones");
    await fullPage(page, "admin-milestones.png");
  });

  test("milestone row — read state (first row)", async ({ page }) => {
    await page.goto("/admin/milestones");
    const row = page.locator("article").first();
    await component(row, "admin-milestone-row-read.png");
  });

  test("milestone row — hover reveals pencil", async ({ page }) => {
    await page.goto("/admin/milestones");
    const row = page.locator("article").first();
    await component(row, "admin-milestone-row-hover.png", { hover: row });
  });

  test("milestone threshold input — focus ring", async ({ page }) => {
    await page.goto("/admin/milestones");
    const input = page.locator('input[id^="threshold-"]').first();
    await component(input, "admin-milestone-input-focus.png", {
      focus: input,
    });
  });
});
