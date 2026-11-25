import { describe, expect, it } from "vitest";
import { CATALOG } from "./catalog";
import { Image, Link, PageSchema, SECTION_SCHEMAS, SECTION_TYPES } from "./schemas";
import { HAND_BUILT_PAGE, REFERENCE_PAGE, SAMPLE_PAGES } from "@/lib/site/sample-pages";

describe("PageSchema", () => {
  it("accepts the reference page, the five sample pages and the hand-built page", () => {
    const pages = { reference: REFERENCE_PAGE, ...SAMPLE_PAGES, handBuilt: HAND_BUILT_PAGE };
    for (const [name, page] of Object.entries(pages)) {
      const result = PageSchema.safeParse(page);
      expect(result.success, `${name}: ${result.error?.message}`).toBe(true);
    }
  });

  it("accepts every catalog default", () => {
    for (const type of SECTION_TYPES) {
      const result = SECTION_SCHEMAS[type].safeParse(CATALOG[type].defaultProps);
      expect(result.success, `${type}: ${result.error?.message}`).toBe(true);
    }
  });
});

describe("Link", () => {
  it.each(["javascript:alert(1)", "data:text/html,x", "//evil.com", "www.example.com", "tel:+9771555"])("rejects %s", (href) => {
    expect(Link.safeParse(href).success).toBe(false);
  });

  it.each(["https://a.co", "mailto:a@b.co"])("accepts %s", (href) => {
    expect(Link.safeParse(href).success).toBe(true);
  });
});

describe("Image", () => {
  it("rejects a photo from another site", () => {
    expect(Image.safeParse({ src: "https://example.com/x.jpg", alt: "" }).success).toBe(false);
  });
});
