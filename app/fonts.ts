// app/fonts.ts
import { Plus_Jakarta_Sans, Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";

// Published sites (body + 3 heading choices). None are preloaded: Next preloads a font on every route of each
// layout that imports this file, and the landing page preloads only the app's Figtree and Bricolage (Step 13).
export const siteBody = Inter({ subsets: ["latin"], variable: "--font-site-body", display: "swap", preload: false });
export const siteSans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-site-sans", display: "swap", preload: false });
export const siteSerif = Fraunces({ subsets: ["latin"], variable: "--font-site-serif", axes: ["opsz"], display: "swap", preload: false });
export const siteMono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-site-mono", weight: ["500", "600"], display: "swap", preload: false });

export const siteFontVars = [siteBody, siteSans, siteSerif, siteMono].map((f) => f.variable).join(" ");
