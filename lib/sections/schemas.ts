import { z } from "zod";

export const THEMES = ["paper", "midnight", "sunset", "forest", "ocean", "mono"] as const;
export const FONTS = ["sans", "serif", "mono"] as const;
export const FEATURE_ICONS = ["sparkles", "star", "heart", "shield-check", "zap", "clock", "leaf", "wheat", "coffee", "utensils", "truck", "package", "gift", "camera", "palette", "pen-tool", "code", "rocket", "users", "award", "calendar", "smile", "gauge", "type"] as const;
export const SOCIAL_PLATFORMS = ["instagram", "facebook", "x", "linkedin", "youtube", "tiktok", "github", "whatsapp", "website"] as const;

const str = (max: number) => z.string().trim().min(1).max(max);
const optStr = (max: number) => z.string().trim().max(max).optional();

export const Link = z.string().trim().max(500)
  .regex(/^(https?:\/\/|mailto:|tel:)/i, "Use a link that starts with https://, http://, mailto: or tel:");
export const Button = z.object({ label: str(30), href: Link });
export const Image = z.object({
  src: z.string().regex(/^\/(library|uploads)\/[\w\-/.]+$/, "Pick an image from the library or upload one"),
  alt: z.string().trim().max(200),
});

export const HeroProps = z.object({
  headline: str(80),
  subheadline: optStr(200),
  primaryButton: Button.optional(),
  secondaryButton: Button.optional(),
  image: Image.optional(),
  layout: z.enum(["centered", "split"]).default("split"),
});
export const AboutProps = z.object({ heading: str(80), text: str(800), image: Image.optional() });
export const FeaturesProps = z.object({
  heading: str(80),
  columns: z.enum(["3", "4"]).default("3"),
  items: z.array(z.object({ icon: z.enum(FEATURE_ICONS), title: str(50), text: str(200) })).min(2).max(8),
});
export const ServicesProps = z.object({
  heading: str(80),
  items: z.array(z.object({ title: str(60), text: optStr(240), price: optStr(30) })).min(1).max(12),
});
export const GalleryProps = z.object({
  heading: optStr(80),
  images: z.array(z.object({ image: Image, caption: optStr(80) })).min(2).max(9),
});
export const TestimonialsProps = z.object({
  heading: str(80),
  items: z.array(z.object({ quote: str(280), name: str(60), role: optStr(60), avatar: Image.optional() })).min(1).max(6),
});
export const PricingProps = z.object({
  heading: str(80),
  plans: z.array(z.object({
    name: str(40),
    price: str(20),
    period: optStr(20),
    features: z.array(str(80)).max(8),
    button: Button.optional(),
    highlighted: z.boolean().default(false),
  })).min(1).max(4),
});
export const FAQProps = z.object({
  heading: str(80),
  items: z.array(z.object({ question: str(120), answer: str(600) })).min(1).max(12),
});
export const CallToActionProps = z.object({ heading: str(80), text: optStr(240), button: Button });
export const ContactProps = z.object({
  heading: str(80),
  email: z.string().trim().email().max(120).optional(),
  phone: optStr(30),
  address: optStr(160),
  socials: z.array(z.object({ platform: z.enum(SOCIAL_PLATFORMS), url: Link })).max(6).default([]),
});
export const LinksProps = z.object({
  items: z.array(z.object({ label: str(40), href: Link })).min(1).max(12),
});

export const SECTION_SCHEMAS = {
  Hero: HeroProps, About: AboutProps, Features: FeaturesProps, Services: ServicesProps,
  Gallery: GalleryProps, Testimonials: TestimonialsProps, Pricing: PricingProps, FAQ: FAQProps,
  CallToAction: CallToActionProps, Contact: ContactProps, Links: LinksProps,
} as const;
export type SectionType = keyof typeof SECTION_SCHEMAS;
export const SECTION_TYPES = Object.keys(SECTION_SCHEMAS) as SectionType[];

export const RootProps = z.object({
  title: str(60),
  theme: z.enum(THEMES).default("paper"),
  font: z.enum(FONTS).default("sans"),
  favicon: z.string().min(1).max(8).default("✨"),
  description: z.string().trim().max(160).default(""),
  showBadge: z.boolean().default(true), // only Pro can turn it off (Step 12)
});

const Section = z.discriminatedUnion("type", SECTION_TYPES.map((t) =>
  z.object({ type: z.literal(t), props: SECTION_SCHEMAS[t].extend({ id: z.string().min(1) }) }),
) as never);

export const PageSchema = z.object({
  root: z.object({ props: RootProps }),
  content: z.array(Section).max(12),
  zones: z.record(z.string(), z.unknown()).optional(),
});

export const EMPTY_PAGE = {
  root: { props: { title: "Untitled site", theme: "paper", font: "sans", favicon: "✨", description: "", showBadge: true } },
  content: [],
  zones: {},
} satisfies z.input<typeof PageSchema>;
