// ─────────────────────────────────────────────────────────────────────────────
// Gradient tokens — single source of truth for material / asset thumbnail hues.
//
// These are *design tokens*, not ad-hoc gradients. Every surface that renders
// a typed asset thumbnail must read from MATERIAL_GRADIENTS via
// getMaterialGradient() — no inline gradients, no opacity wash, no runtime
// color synthesis. Changes land here and propagate everywhere.
// ─────────────────────────────────────────────────────────────────────────────

// Each token layers a top-left radial "light source" over a 2-hue linear
// gradient. Two distinct hues per type so every card reads as its own
// identity — no repeat of the same family across types.
//
//   banner   indigo  → purple
//   email    deep teal-green
//   social   magenta → wine
//   copy     muted amber
//   guide    dusty blue
//   story    deep purple
export const MATERIAL_GRADIENTS = {
  banner:
    "radial-gradient(120% 120% at 0% 0%, rgba(255,255,255,0.12) 0%, transparent 50%), linear-gradient(135deg, #2A2F6E 0%, #4B3C8F 100%)",
  email:
    "radial-gradient(120% 120% at 0% 0%, rgba(255,255,255,0.10) 0%, transparent 50%), linear-gradient(135deg, #0F5A4F 0%, #1F7A6E 100%)",
  social:
    "radial-gradient(120% 120% at 0% 0%, rgba(255,255,255,0.10) 0%, transparent 50%), linear-gradient(135deg, #6A1F3B 0%, #8E2C58 100%)",
  copy:
    "radial-gradient(120% 120% at 0% 0%, rgba(255,255,255,0.08) 0%, transparent 50%), linear-gradient(135deg, #7A4E1D 0%, #A06A2C 100%)",
  guide:
    "radial-gradient(120% 120% at 0% 0%, rgba(255,255,255,0.10) 0%, transparent 50%), linear-gradient(135deg, #244A73 0%, #3A6A9A 100%)",
  story:
    "radial-gradient(120% 120% at 0% 0%, rgba(255,255,255,0.10) 0%, transparent 50%), linear-gradient(135deg, #3E2A6E 0%, #5A3C9A 100%)",
} as const;

export type MaterialGradientKey = keyof typeof MATERIAL_GRADIENTS;

// Explicit switch — makes the mapping unambiguous and gives TypeScript an
// exhaustiveness check if MaterialGradientKey ever grows. Unknown types snap
// to banner so the grid never renders a bare background.
export function getMaterialGradient(type: string): string {
  switch (type) {
    case "banner":
      return MATERIAL_GRADIENTS.banner;
    case "email":
      return MATERIAL_GRADIENTS.email;
    case "social":
      return MATERIAL_GRADIENTS.social;
    case "copy":
      return MATERIAL_GRADIENTS.copy;
    case "guide":
      return MATERIAL_GRADIENTS.guide;
    case "story":
      return MATERIAL_GRADIENTS.story;
    default:
      return MATERIAL_GRADIENTS.banner;
  }
}
