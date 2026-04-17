// ─────────────────────────────────────────────────────────────────────────────
// Gradient tokens — single source of truth for material / asset thumbnail hues.
//
// These are *design tokens*, not ad-hoc gradients. Every surface that renders
// a typed asset thumbnail must read from MATERIAL_GRADIENTS via
// getMaterialGradient() — no inline gradients, no opacity wash, no runtime
// color synthesis. Changes land here and propagate everywhere.
// ─────────────────────────────────────────────────────────────────────────────

export const MATERIAL_GRADIENTS = {
  banner: "linear-gradient(135deg, #2A3A6C 0%, #3B2F6B 50%, #4C2A5F 100%)",
  email:  "linear-gradient(135deg, #0F3D3E 0%, #116466 50%, #1C7C7D 100%)",
  social: "linear-gradient(135deg, #5A1E3B 0%, #7A274A 50%, #9B2C5A 100%)",
  copy:   "linear-gradient(135deg, #5A3A1E 0%, #7A4F27 50%, #9B6A2C 100%)",
  guide:  "linear-gradient(135deg, #1E3A5A 0%, #274B7A 50%, #2C5F9B 100%)",
  story:  "linear-gradient(135deg, #3A2A5A 0%, #4B2F7A 50%, #5F2C9B 100%)",
} as const;

export type MaterialGradientKey = keyof typeof MATERIAL_GRADIENTS;

// Subtle top-left light direction — applied by appending as a second image so
// the underlying hue stays pure but picks up a Figma-like highlight.
const GRADIENT_HIGHLIGHT =
  "radial-gradient(circle at top left, rgba(255,255,255,0.08), transparent 45%)";

// Hard fallback: unknown types snap to `banner` so the grid never renders a
// bare or random background.
export function getMaterialGradient(type: string): string {
  const key = (type in MATERIAL_GRADIENTS ? type : "banner") as MaterialGradientKey;
  return `${GRADIENT_HIGHLIGHT}, ${MATERIAL_GRADIENTS[key]}`;
}
