import type { UseCase } from "@/lib/analytics/events";

/** Three example prompts per use case, shown under "Try an example" on /new. */
export const EXAMPLES: Record<UseCase, [string, string, string]> = {
  business: [
    "A small bakery in Patan. Sourdough, cardamom buns and weekend brunch. Warm and friendly.",
    "A plumbing and heating service in Lalitpur. Emergency call-outs, fixed prices and a phone number people can tap.",
    "A family-run guesthouse near Phewa Lake with six rooms, a rooftop café and trekking help.",
  ],
  portfolio: [
    "Portfolio for a freelance product designer who works with health and finance startups. Minimal.",
    "A wedding photographer in Kathmandu. Show recent shoots, packages and how to book.",
    "A frontend developer looking for remote work. Projects, skills and a short bio. Clean and simple.",
  ],
  event: [
    "A free evening meetup for web developers on 12 December. Three talks on performance, 80 seats. Bold.",
    "Our wedding on 8 February in Pokhara. Schedule, venue, where to stay and RSVP by email.",
    "A weekend charity run around Phewa Lake. 5 km and 10 km routes, registration fee and prizes.",
  ],
  product: [
    "A habit-tracking app for students. Streaks, reminders and a free plan. Playful.",
    "Handmade ceramic mugs sold online. Three collections, shipping across Nepal.",
    "A smart plant sensor that tells you when to water. Features, pricing and questions people ask.",
  ],
  other: [
    "A link page for a travel creator: YouTube, Instagram, newsletter and gear list.",
    "A neighbourhood book club that meets monthly. Next book, meeting place and how to join.",
    "A volunteer group cleaning up the Bagmati river. Upcoming events and how to help.",
  ],
};

export const USE_CASES = ["business", "portfolio", "event", "product", "other"] as const satisfies readonly UseCase[];

export function isUseCase(value: unknown): value is UseCase {
  return typeof value === "string" && (USE_CASES as readonly string[]).includes(value);
}
