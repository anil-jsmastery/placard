import { describe, expect, it } from "vitest";
import { Image, Link, PageSchema, SECTION_SCHEMAS, SECTION_TYPES } from "./schemas";
import { SECTION_CATALOG } from "./catalog";
import { SAMPLE_PAGE } from "../site/sample-page";
import { DEMO_LOG, DEMO_PAGE } from "../marketing/demo";
import { EXAMPLES } from "../marketing/examples";

describe("PageSchema", () => {
  it("accepts the sample page", () => {
    const result = PageSchema.safeParse(SAMPLE_PAGE);
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });

  it("accepts the landing page demo", () => {
    const result = PageSchema.safeParse(DEMO_PAGE);
    expect(result.error?.issues ?? []).toEqual([]);
    expect(DEMO_PAGE.content).toHaveLength(DEMO_LOG.length - 1);
  });

  it.each(EXAMPLES.map((e) => [e.title, e.page] as const))("accepts the landing example %s", (_title, page) => {
    const result = PageSchema.safeParse(page);
    expect(result.error?.issues ?? []).toEqual([]);
  });
});

describe("catalog", () => {
  it.each(SECTION_TYPES)("%s defaultProps pass the schema", (type) => {
    const result = SECTION_SCHEMAS[type].safeParse(SECTION_CATALOG[type].defaultProps);
    expect(result.error?.issues ?? []).toEqual([]);
    expect(result.success).toBe(true);
  });
});

describe("Link", () => {
  it.each(["javascript:alert(1)", "data:text/html,x", "//evil.com", "www.example.com"])("rejects %s", (href) => {
    expect(Link.safeParse(href).success).toBe(false);
  });
  it.each(["https://a.co", "mailto:a@b.co", "tel:+9771555"])("accepts %s", (href) => {
    expect(Link.safeParse(href).success).toBe(true);
  });
});

describe("Image", () => {
  it("rejects an outside URL", () => {
    expect(Image.safeParse({ src: "https://example.com/x.jpg", alt: "x" }).success).toBe(false);
  });
});
