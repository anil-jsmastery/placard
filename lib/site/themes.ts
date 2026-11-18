import type { FONTS, THEMES } from "../sections/schemas";

export type Theme = (typeof THEMES)[number];
export type Font = (typeof FONTS)[number];

// Swatch colours for the theme picker only, copied from the site tokens in app/globals.css.
export const THEME_META: Record<Theme, { label: string; bg: string; text: string; accent: string }> = {
  paper: { label: "Paper", bg: "#fbfaf7", text: "#1d1c1a", accent: "#2847c9" },
  midnight: { label: "Midnight", bg: "#0d1120", text: "#eceff7", accent: "#8ea6ff" },
  sunset: { label: "Sunset", bg: "#fff3ea", text: "#2a1812", accent: "#c23e22" },
  forest: { label: "Forest", bg: "#eff3ec", text: "#15241a", accent: "#2e6a3e" },
  ocean: { label: "Ocean", bg: "#edf5f9", text: "#0e2431", accent: "#0b6e99" },
  mono: { label: "Mono", bg: "#ffffff", text: "#000000", accent: "#000000" },
};

export const FONT_META: Record<Font, { label: string }> = {
  sans: { label: "Sans" },
  serif: { label: "Serif" },
  mono: { label: "Mono" },
};
