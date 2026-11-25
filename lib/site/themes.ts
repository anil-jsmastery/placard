import type { FONTS, SPACINGS, THEMES } from "@/lib/sections/schemas";

type Theme = (typeof THEMES)[number];
type Font = (typeof FONTS)[number];
type Spacing = (typeof SPACINGS)[number];

// Names and swatch colours for pickers only; the real colours are in app/site.css.
export const THEME_META: Record<Theme, { name: string; bg: string; card: string; ink: string; acc: string }> = {
  paper:    { name: "Paper",    bg: "#F2EFE7", card: "#E7E2D6", ink: "#151412", acc: "#2B44FF" },
  midnight: { name: "Midnight", bg: "#0F100D", card: "#1B1C18", ink: "#EEECE4", acc: "#D2F34C" },
  sunset:   { name: "Sunset",   bg: "#F7E9DC", card: "#EFD7C3", ink: "#2A160C", acc: "#E2552B" },
  forest:   { name: "Forest",   bg: "#E8ECE2", card: "#D9E0CF", ink: "#15221A", acc: "#24573B" },
  ocean:    { name: "Ocean",    bg: "#E9EFEF", card: "#D6E2E3", ink: "#0B1D22", acc: "#0B6E7A" },
  mono:     { name: "Mono",     bg: "#FAFAF9", card: "#EDEDEB", ink: "#0A0A0A", acc: "#0A0A0A" },
};

// The font variables come from app/fonts.ts; used for the "Aa" preview.
export const FONT_META: Record<Font, { name: string; variable: string; weight: number }> = {
  sans:  { name: "Sans",  variable: "var(--font-bricolage)",        weight: 600 },
  serif: { name: "Serif", variable: "var(--font-instrument-serif)", weight: 400 },
  mono:  { name: "Techy", variable: "var(--font-geist-mono)",       weight: 500 },
};

export const SPACING_META: Record<Spacing, { name: string }> = {
  relaxed: { name: "Relaxed" },
  compact: { name: "Compact" },
};
