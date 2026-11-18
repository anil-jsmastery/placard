import {
  BadgeDollarSign,
  CircleHelp,
  Images,
  LayoutGrid,
  LayoutTemplate,
  Link,
  List,
  Mail,
  Megaphone,
  Quote,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { SectionType } from "./schemas";
import type { SectionProps } from "../site/types";
import { getImageById } from "../images/library";

type CatalogEntry<T extends SectionType> = {
  label: string;
  icon: LucideIcon;
  /** One line telling the AI when to use this section. */
  aiHint: string;
  /** What "Add" inserts. Must pass the section's schema. */
  defaultProps: SectionProps<T>;
};

const libraryImage = (id: string) => {
  const image = getImageById(id);
  if (!image) throw new Error(`Unknown library image ${id}`);
  return { src: image.src, alt: image.alt };
};

export const SECTION_CATALOG: { [T in SectionType]: CatalogEntry<T> } = {
  Hero: {
    label: "Hero",
    icon: LayoutTemplate,
    aiHint: "First section. Headline, one-line pitch, main action.",
    defaultProps: {
      headline: "Your headline",
      subheadline: "One or two sentences about what you do.",
      layout: "centered",
    },
  },
  About: {
    label: "About",
    icon: UserRound,
    aiHint: "The story or the person behind it.",
    defaultProps: {
      heading: "About us",
      text: "Tell visitors who you are and why you do this.",
    },
  },
  Features: {
    label: "Features",
    icon: LayoutGrid,
    aiHint: "3–6 reasons to choose them.",
    defaultProps: {
      heading: "Why choose us",
      columns: "3",
      items: [
        { icon: "sparkles", title: "First reason", text: "Say what makes you different." },
        { icon: "heart", title: "Second reason", text: "Say what customers love about you." },
        { icon: "star", title: "Third reason", text: "Say what you're known for." },
      ],
    },
  },
  Services: {
    label: "Services",
    icon: List,
    aiHint: "What they offer, optionally with prices. Use for menus too.",
    defaultProps: {
      heading: "What we offer",
      items: [
        { title: "First service", text: "Describe what's included." },
        { title: "Second service", text: "Describe what's included." },
        { title: "Third service", text: "Describe what's included." },
      ],
    },
  },
  Gallery: {
    label: "Gallery",
    icon: Images,
    aiHint: "Photos of the work, place or product.",
    defaultProps: {
      heading: "Gallery",
      images: [
        { image: libraryImage("food-01") },
        { image: libraryImage("office-01") },
        { image: libraryImage("nature-01") },
      ],
    },
  },
  Testimonials: {
    label: "Testimonials",
    icon: Quote,
    aiHint: "Only with quotes the user gave you. Never invent quotes, names or reviews.",
    defaultProps: {
      heading: "What people say",
      items: [{ quote: "Add a quote from a real customer.", name: "Customer name" }],
    },
  },
  Pricing: {
    label: "Pricing",
    icon: BadgeDollarSign,
    aiHint: "Plans or packages with prices.",
    defaultProps: {
      heading: "Pricing",
      plans: [
        { name: "Basic", price: "$10", period: "/ month", features: ["What's included"], highlighted: false },
        { name: "Plus", price: "$20", period: "/ month", features: ["Everything in Basic", "What else is included"], highlighted: true },
      ],
    },
  },
  FAQ: {
    label: "FAQ",
    icon: CircleHelp,
    aiHint: "Common questions with short answers.",
    defaultProps: {
      heading: "Questions",
      items: [
        { question: "First question", answer: "A short answer." },
        { question: "Second question", answer: "A short answer." },
        { question: "Third question", answer: "A short answer." },
      ],
    },
  },
  CallToAction: {
    label: "Call to action",
    icon: Megaphone,
    aiHint: "One strong next step near the end.",
    defaultProps: {
      heading: "Ready to start?",
      button: { label: "Get in touch", href: "mailto:hello@example.com" },
    },
  },
  Contact: {
    label: "Contact",
    icon: Mail,
    aiHint: "How to reach or find them. Usually last.",
    defaultProps: {
      heading: "Contact",
      email: "hello@example.com",
      socials: [],
    },
  },
  Links: {
    label: "Links",
    icon: Link,
    aiHint: "Link-in-bio list of buttons.",
    defaultProps: {
      items: [
        { label: "First link", href: "https://example.com" },
        { label: "Second link", href: "https://example.com" },
        { label: "Third link", href: "https://example.com" },
      ],
    },
  },
};
