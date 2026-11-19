// app/(main)/fonts.ts: the app's fonts, imported only by the app's layout, so live sites never preload them.
import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from "next/font/google";
import { siteFontVars } from "../fonts";

export const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
export const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", axes: ["opsz", "wdth"], display: "swap" });
export const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["400", "500"], display: "swap", preload: false });

export const appFontVars = [figtree.variable, bricolage.variable, jetbrains.variable, siteFontVars].join(" ");
