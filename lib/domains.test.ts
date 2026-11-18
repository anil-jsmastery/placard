import { describe, expect, it } from "vitest";
import { isReservedSlug, isValidSlug, RESERVED_SLUGS, slugify } from "./domains";

describe("slugify", () => {
  it("turns & into and", () => expect(slugify("Ember & Rye")).toBe("ember-and-rye"));
  it("strips accents and keeps ASCII only", () => expect(slugify("Café Déjà Vu")).toBe("cafe-deja-vu"));
  it("normalizes compatibility characters before lowercasing", () => expect(slugify("𝐀cme")).toBe("acme"));
  it("collapses and trims hyphens", () => expect(slugify("  --Hello,   World!!--  ")).toBe("hello-world"));
  it("drops characters with no ASCII form", () => expect(slugify("नमस्ते Kathmandu")).toBe("kathmandu"));
  it("cuts to 30 characters without a trailing hyphen", () => {
    const slug = slugify("The quick brown fox jumps over the lazy dog");
    expect(slug.length).toBeLessThanOrEqual(30);
    expect(slug).toBe("the-quick-brown-fox-jumps-over");
    expect(slugify("abcdefghijklmnopqrstuvwxyzabc defg")).toBe("abcdefghijklmnopqrstuvwxyzabc");
  });
  it("returns an empty string when nothing is left", () => expect(slugify("!!!")).toBe(""));
});

describe("isValidSlug", () => {
  it.each(["abc", "ember-and-rye", "site-a1b2c3", "a".repeat(30), "a-b"])("accepts %s", (s) =>
    expect(isValidSlug(s)).toBe(true),
  );
  it.each(["", "ab", "a".repeat(31), "-abc", "abc-", "Abc", "a_b", "café", "a b"])("rejects %j", (s) =>
    expect(isValidSlug(s)).toBe(false),
  );
});

describe("reserved slugs", () => {
  it("blocks the app's and Clerk's names", () => {
    for (const s of ["www", "app", "api", "admin", "new", "clerk", "accounts", "clkmail", "sign-in"]) {
      expect(isReservedSlug(s)).toBe(true);
    }
  });
  it("allows ordinary names", () => expect(isReservedSlug("ember-and-rye")).toBe(false));
  it("has 31 entries", () => expect(RESERVED_SLUGS).toHaveLength(31));
});
