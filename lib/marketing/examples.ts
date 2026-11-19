import { getImageById } from "@/lib/images/library";
import { SAMPLE_PAGE } from "@/lib/site/sample-page";
import type { PageData, SectionData } from "@/lib/site/types";

export type Example = { title: string; prompt: string; page: PageData };

const img = (id: string) => {
  const image = getImageById(id);
  if (!image) throw new Error(`Unknown library image ${id}`);
  return { src: image.src, alt: image.alt };
};

const sample = (type: SectionData["type"]) => {
  const found = SAMPLE_PAGE.content.find((s) => s.type === type);
  if (!found) throw new Error(`The sample page has no ${type} section`);
  return found;
};

/** The three sites under "Each of these started as one sentence" on the landing page. */
export const EXAMPLES: Example[] = [
  {
    title: "Ember & Rye, a bakery",
    prompt: "A small bakery in Patan. Sourdough, cardamom buns and weekend brunch. Warm and friendly.",
    page: {
      root: { props: { ...SAMPLE_PAGE.root.props, theme: "sunset", font: "serif" } },
      content: [sample("Hero"), sample("Features")],
      zones: {},
    },
  },
  {
    title: "Asha Gurung, a portfolio",
    prompt: "Portfolio for a freelance product designer who works with health and finance startups. Minimal.",
    page: {
      root: {
        props: {
          title: "Asha Gurung",
          theme: "paper",
          font: "sans",
          favicon: "✨",
          description: "Product designer for calm, useful software.",
          showBadge: true,
        },
      },
      content: [
        {
          type: "Hero",
          props: {
            id: "Hero-asha-gurung",
            headline: "Product designer for calm, useful software",
            subheadline: "I’m Asha Gurung. I design and test interfaces for health and finance startups. Booking projects for January.",
            primaryButton: { label: "See my work", href: "https://ashagurung.example/work" },
            secondaryButton: { label: "Email me", href: "mailto:hello@ashagurung.example" },
            image: img("abstract-03"),
            layout: "centered",
          },
        },
      ],
      zones: {},
    },
  },
  {
    title: "Valley Frontend Night, an event",
    prompt: "A free evening meetup for web developers on 12 December. Three talks on performance, 80 seats. Bold.",
    page: {
      root: {
        props: {
          title: "Valley Frontend Night",
          theme: "midnight",
          font: "mono",
          favicon: "✨",
          description: "Three talks on web performance, 12 December.",
          showBadge: true,
        },
      },
      content: [
        {
          type: "Hero",
          props: {
            id: "Hero-valley-frontend",
            headline: "Valley Frontend Night, 12 December",
            subheadline: "Three talks on web performance, food at six and a room full of people who build for the web. Free, 80 seats.",
            primaryButton: { label: "Save my seat", href: "https://valleyfrontend.example/rsvp" },
            secondaryButton: { label: "See the talks", href: "https://valleyfrontend.example/talks" },
            image: img("people-04"),
            layout: "split",
          },
        },
        {
          type: "Features",
          props: {
            id: "Features-valley-frontend",
            heading: "Three talks, one evening",
            columns: "3",
            items: [
              { icon: "zap", title: "Shipping less JavaScript", text: "How one team cut its bundle in half without a rewrite." },
              { icon: "type", title: "Fonts without the flash", text: "Loading web fonts so text never jumps." },
              { icon: "gauge", title: "Measuring what users feel", text: "Real-user metrics that match what people notice." },
            ],
          },
        },
      ],
      zones: {},
    },
  },
];
