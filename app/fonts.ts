// app/fonts.ts
import { Bricolage_Grotesque, Figtree, JetBrains_Mono, Plus_Jakarta_Sans, Fraunces, IBM_Plex_Mono, Inter } from "next/font/google";

// App
export const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
export const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", axes: ["opsz", "wdth"], display: "swap" });
export const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["400", "500"], display: "swap", preload: false });

// Published sites (body + 3 heading choices)
export const siteBody = Inter({ subsets: ["latin"], variable: "--font-site-body", display: "swap" });
export const siteSans = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-site-sans", display: "swap", preload: false });
export const siteSerif = Fraunces({ subsets: ["latin"], variable: "--font-site-serif", axes: ["opsz"], display: "swap", preload: false });
export const siteMono = IBM_Plex_Mono({ subsets: ["latin"], variable: "--font-site-mono", weight: ["500", "600"], display: "swap", preload: false });

export const appFontVars = [figtree, bricolage, jetbrains, siteBody, siteSans, siteSerif, siteMono].map((f) => f.variable).join(" ");
export const siteFontVars = [siteBody, siteSans, siteSerif, siteMono].map((f) => f.variable).join(" ");
