# Festify Visual QA

Playwright visual regression suite for the Festify Affiliates app. Captures
baseline screenshots of every major screen + key components, then fails CI if
a subsequent run differs by more than 1% of pixels.

## Setup

```bash
cd visual-qa
npm install
npm run install:browsers   # downloads Chromium
```

Demo credentials come from `backend/prisma/seed.ts`:

- **Admin** — `admin@festify.io` / `Password123!`
- **Affiliate** — `alex@festify.io` / `Password123!`

The suite runs against `https://frontend-one-sepia-69.vercel.app` by default.
Override per-run:

```bash
BASE_URL=http://localhost:3000 npm test
```

## Folder structure

```
visual-qa/
├─ package.json
├─ playwright.config.ts
├─ tests/
│  ├─ helpers/
│  │  ├─ auth.ts               # login, idle-wait, flaky-bit masking
│  │  └─ snapshot.ts           # fullPage / component / hover / focus / active
│  ├─ dashboard.spec.ts        # affiliate-side screens
│  ├─ admin.spec.ts            # admin-side screens
│  ├─ component.spec.ts        # cross-cutting buttons / inputs / badges
│  ├─ dashboard.spec.ts-snapshots/   # auto-created on first run
│  ├─ admin.spec.ts-snapshots/
│  └─ component.spec.ts-snapshots/
└─ playwright-report/          # HTML report from the last run
```

## First run — seed baselines

Baselines don't exist yet; the first run creates them.

```bash
npm run update
```

Review the generated PNGs under `tests/*-snapshots/`. These are your
**Figma-equivalent source of truth** going forward — only update them when
the UI is _intentionally_ changing.

```bash
git add tests/**/*-snapshots
git commit -m "visual-qa: seed baseline snapshots"
```

## Regular runs

```bash
npm test               # fails if anything differs > 1% pixels
npm run test:headed    # watch Chromium drive the app
npm run test:ui        # Playwright's interactive UI runner
npm run report         # open the HTML report from the last run
```

## Updating baselines after an intentional design change

```bash
# After you merge a design change, regenerate baselines:
npm run update

# Or for a specific spec:
npm run update:admin
npm run update:dashboard
npm run update:component

# Review the diff in the PR, then commit:
git add tests/**/*-snapshots
git commit -m "visual-qa: refresh baselines for <change>"
```

## Tuning strictness

`playwright.config.ts`:

```ts
expect: {
  toHaveScreenshot: {
    maxDiffPixelRatio: 0.01,   // 1% of pixels may differ
    threshold: 0.2,            // per-pixel tolerance 0..1
  },
}
```

Drop `maxDiffPixelRatio` to `0` for pixel-perfect (will flag anti-aliasing
differences across OSes — don't do this in CI unless everything runs on the
same Docker image).

## What's covered

| Spec | Screens / components |
|---|---|
| `dashboard.spec.ts` | `/dashboard`, `/dashboard/materials`, `/dashboard/milestones`. KPI grid, material card (default + hover), download focus ring, filter tabs, milestone row |
| `admin.spec.ts` | `/admin`, `/admin/affiliates`, `/admin/commissions`, `/admin/materials`, `/admin/milestones`. Table, row hover, affiliate drawer, upload modal, Mark Paid button, milestone row read + edit, threshold input focus |
| `component.spec.ts` | Primary / ghost buttons × {default, hover, focus, active}; search + text inputs × {default, focus}; tier + status pills; commissions row + Outstanding KPI card |

## Figma reference

Figma file: https://www.figma.com/design/xpulyUWPCjSjSA5LbCeLMA/Token-29--Copy-

Playwright doesn't pull from Figma directly — the workflow is:

1. Eyeball a Figma frame.
2. Implement it in code.
3. Run `npm run update` to seed the baseline snapshot.
4. Subsequent runs fail if the live UI drifts away from that baseline.

To re-align with Figma after a design change, update the UI → run `update`
→ review the snapshot diff in the PR.

## Deterministic environment

The config pins:

- Viewport `1440 × 900` (matches the Figma canvas width)
- `deviceScaleFactor: 1`
- `colorScheme: dark`
- `locale: en-US`, `timezoneId: Asia/Singapore`
- Animations disabled globally (both Playwright's `animations: disabled` and
  a global CSS override via `maskFlakyBits`)

Timestamps, notification dots, and any element tagged `data-flaky` are
hidden via CSS on every page load so they don't drift between runs.

## CI hook (example)

Add to GitHub Actions:

```yaml
- uses: actions/setup-node@v4
  with: { node-version: 22 }
- run: npm ci
  working-directory: visual-qa
- run: npx playwright install --with-deps chromium
  working-directory: visual-qa
- run: npm test
  working-directory: visual-qa
  env:
    BASE_URL: ${{ secrets.VERCEL_URL }}
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-report
    path: visual-qa/playwright-report
```

If a run fails, download the `playwright-report` artifact — it bundles the
expected/actual/diff PNGs per failing shot.
