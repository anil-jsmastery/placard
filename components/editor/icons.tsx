import {
  AlignLeft, BookOpen, Briefcase, Camera, Code, Globe, Image, Info, LayoutGrid, List, Mail,
  MessageSquareQuote, Palette, PanelTop, PenTool, Sparkles, Star, type LucideIcon,
} from "lucide-react";
import type { SectionType, TAB_ICONS } from "@/lib/sections/schemas";

// The catalog's lucide names as components (kebab-case → PascalCase).
export const SECTION_ICONS: Record<SectionType, LucideIcon> = {
  Intro: PanelTop, Work: LayoutGrid, About: AlignLeft, Experience: Briefcase, Services: List,
  Testimonials: MessageSquareQuote, Gallery: Image, Writing: BookOpen, Details: Info, Contact: Mail,
};

export const TAB_ICON_COMPONENTS: Record<(typeof TAB_ICONS)[number], LucideIcon> = {
  "pen-tool": PenTool, code: Code, camera: Camera, palette: Palette, "book-open": BookOpen,
  sparkles: Sparkles, star: Star, globe: Globe,
};
