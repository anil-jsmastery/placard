import { z } from "zod";

export const THEMES = ["paper", "midnight", "sunset", "forest", "ocean", "mono"] as const;
export const FONTS = ["sans", "serif", "mono"] as const;
export const SPACINGS = ["relaxed", "compact"] as const;
export const TAB_ICONS = ["pen-tool", "code", "camera", "palette", "book-open", "sparkles", "star", "globe"] as const;
export const SOCIAL_PLATFORMS = ["instagram", "linkedin", "x", "github", "dribbble", "behance", "youtube", "substack", "website"] as const;

const str = (max: number) => z.string().trim().min(1).max(max);
const optStr = (max: number) => z.string().trim().max(max).optional();
const hidden = { hidden: z.boolean().optional() };

export const Link = z.string().trim().max(500)
  .regex(/^(https?:\/\/|mailto:)/i, "Use a link that starts with https://, http:// or mailto:");
export const Button = z.object({ label: str(30), href: Link });
export const Image = z.object({
  src: z.string().regex(/^\/(library|uploads)\/[\w\-/.]+$/, "Pick a photo from the library or upload one"),
  alt: z.string().trim().max(200),
});

export const IntroProps = z.object({
  layout: z.enum(["statement", "split"]).default("statement"),
  headline: str(90),
  intro: optStr(300),
  role: optStr(60),
  primaryButton: Button.optional(),
  secondaryButton: Button.optional(),
  image: Image.optional(),
  ...hidden,
});
export const WorkProps = z.object({
  heading: str(60),
  layout: z.enum(["grid", "list"]).default("grid"),
  items: z.array(z.object({
    title: str(80), summary: optStr(200), year: optStr(12),
    tags: z.array(str(24)).max(4).default([]), image: Image.optional(), link: Link.optional(),
  })).min(1).max(12),
  ...hidden,
});
export const AboutProps = z.object({ heading: str(40), text: str(600), more: optStr(800), image: Image.optional(), ...hidden });
export const ExperienceProps = z.object({
  heading: str(60),
  items: z.array(z.object({ years: str(30), role: str(80), company: str(80), note: optStr(120) })).min(1).max(10),
  ...hidden,
});
export const ServicesProps = z.object({
  heading: str(60),
  items: z.array(z.object({ title: str(60), text: optStr(200) })).min(1).max(8),
  ...hidden,
});
export const TestimonialsProps = z.object({
  heading: str(60),
  items: z.array(z.object({ quote: str(320), name: str(60), role: optStr(80) })).min(1).max(6),
  ...hidden,
});
export const GalleryProps = z.object({
  heading: optStr(60),
  layout: z.enum(["grid", "mosaic"]).default("grid"),
  images: z.array(z.object({ image: Image.optional(), caption: optStr(80) })).min(1).max(12),
  ...hidden,
});
export const WritingProps = z.object({
  heading: str(60),
  items: z.array(z.object({ title: str(120), outlet: str(60), year: optStr(12), link: Link.optional() })).min(1).max(12),
  ...hidden,
});
export const DetailsProps = z.object({
  items: z.array(z.object({ label: str(30), value: str(80), link: Link.optional() })).min(1).max(4),
  ...hidden,
});
export const ContactProps = z.object({
  heading: str(40),
  email: z.string().trim().email().max(120),
  text: optStr(200),
  socials: z.array(z.object({ platform: z.enum(SOCIAL_PLATFORMS), url: Link })).max(6).default([]),
  ...hidden,
});

export const SECTION_SCHEMAS = {
  Intro: IntroProps, Work: WorkProps, About: AboutProps, Experience: ExperienceProps, Services: ServicesProps,
  Testimonials: TestimonialsProps, Gallery: GalleryProps, Writing: WritingProps, Details: DetailsProps, Contact: ContactProps,
} as const;
export type SectionType = keyof typeof SECTION_SCHEMAS;
export const SECTION_TYPES = Object.keys(SECTION_SCHEMAS) as SectionType[];

export const RootProps = z.object({
  title: str(60),
  theme: z.enum(THEMES).default("paper"),
  font: z.enum(FONTS).default("sans"),
  spacing: z.enum(SPACINGS).default("relaxed"),
  favicon: z.enum(TAB_ICONS).default("sparkles"),
  availability: optStr(40),
  description: z.string().trim().max(160).default(""),
  showBadge: z.boolean().default(true), // only Pro can turn it off (Step 10)
});

const Section = z.discriminatedUnion("type", SECTION_TYPES.map((t) =>
  z.object({ type: z.literal(t), props: SECTION_SCHEMAS[t].extend({ id: z.string().min(1) }) }),
) as never);

export const PageSchema = z.object({
  root: z.object({ props: RootProps }),
  content: z.array(Section).max(12),
  zones: z.record(z.string(), z.unknown()).optional(),
});

// A blank start is plain on purpose: Prettify styles it later (Step 5).
export const EMPTY_PAGE = {
  root: { props: { title: "Untitled portfolio", theme: "mono", font: "sans", spacing: "compact", favicon: "sparkles", description: "", showBadge: true } },
  content: [],
  zones: {},
} satisfies z.input<typeof PageSchema>;
