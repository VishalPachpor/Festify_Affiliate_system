import { type Page, type Locator, expect } from "@playwright/test";
import { waitForIdle, maskFlakyBits } from "./auth";

export type StateSnapshotOptions = {
  /** Element to focus before snapshotting (focus-state capture). */
  focus?: Locator;
  /** Element to hover before snapshotting (hover-state capture). */
  hover?: Locator;
  /** Element to press-and-hold before snapshotting (active-state capture). */
  pressAndHold?: Locator;
  /** Extra wait after the interaction (ms). */
  settleMs?: number;
  /** Forward to toHaveScreenshot (useful to relax diff on specific shots). */
  maxDiffPixelRatio?: number;
};

/** Full-page snapshot with idle-wait + flaky-bit masking already applied. */
export async function fullPage(page: Page, name: string): Promise<void> {
  await waitForIdle(page);
  await maskFlakyBits(page);
  await expect(page).toHaveScreenshot(name, { fullPage: true });
}

/** Component-level snapshot scoped to a Locator. */
export async function component(
  locator: Locator,
  name: string,
  opts: StateSnapshotOptions = {},
): Promise<void> {
  const page = locator.page();
  await waitForIdle(page);
  await maskFlakyBits(page);

  if (opts.hover) {
    await opts.hover.hover();
    await page.waitForTimeout(opts.settleMs ?? 150);
  }
  if (opts.focus) {
    await opts.focus.focus();
    await page.waitForTimeout(opts.settleMs ?? 150);
  }
  if (opts.pressAndHold) {
    // Dispatch pointerdown without release so :active styles apply.
    const box = await opts.pressAndHold.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(opts.settleMs ?? 100);
    }
  }

  await expect(locator).toHaveScreenshot(name, {
    maxDiffPixelRatio: opts.maxDiffPixelRatio,
  });

  if (opts.pressAndHold) {
    await page.mouse.up();
  }
}
