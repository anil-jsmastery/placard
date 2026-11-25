import { beforeEach, describe, expect, it, vi } from "vitest";

// A fake sites table: `eq(sites.slug, x)` becomes { value: x }, and the query finds the rows with that slug.
const rows = vi.hoisted(() => ({ slugs: new Set<string>() }));
vi.mock("drizzle-orm", () => ({ eq: (_col: unknown, value: unknown) => ({ value }) }));
vi.mock("@/lib/db", () => ({
  sites: { id: "id", slug: "slug" },
  db: {
    select: () => ({
      from: () => ({
        where: ({ value }: { value: string }) => ({
          limit: async () => (rows.slugs.has(value) ? [{ id: value }] : []),
        }),
      }),
    }),
  },
}));

const { RESERVED_SLUGS, isValidSlug, slugify, uniqueSlug } = await import("./domains");

describe("slugify", () => {
  it("strips accents and lowercases", () => {
    expect(slugify("Tomás Reyes")).toBe("tomas-reyes");
  });
  it("turns & into and, drops non-ASCII and collapses dashes", () => {
    expect(slugify("  Ink & Paper — Studio!! ")).toBe("ink-and-paper-studio");
    expect(slugify("李 Maya Chen")).toBe("maya-chen");
  });
  it("cuts to 40 characters without a trailing dash", () => {
    const s = slugify("a".repeat(39) + " b c");
    expect(s.length).toBeLessThanOrEqual(40);
    expect(s.endsWith("-")).toBe(false);
  });
});

describe("isValidSlug", () => {
  it.each(["maya-chen", "abc", "a1b", "a".repeat(40)])("accepts %s", (s) => expect(isValidSlug(s)).toBe(true));
  it.each(["ab", "-abc", "abc-", "Maya", "a_b", "a".repeat(41), ""])("rejects %s", (s) => expect(isValidSlug(s)).toBe(false));
});

describe("uniqueSlug", () => {
  beforeEach(() => rows.slugs.clear());

  it("keeps a free slug", async () => {
    expect(await uniqueSlug("maya-chen")).toBe("maya-chen");
  });
  it("adds -2, -3 … when taken", async () => {
    rows.slugs.add("maya-chen");
    expect(await uniqueSlug("maya-chen")).toBe("maya-chen-2");
    rows.slugs.add("maya-chen-2");
    expect(await uniqueSlug("maya-chen")).toBe("maya-chen-3");
  });
  it.each(["www", "app", "sign-in", "clkmail"])("never gives the reserved word %s", async (word) => {
    expect(RESERVED_SLUGS).toContain(word);
    expect(await uniqueSlug(word)).toMatch(/^portfolio-[a-z]{4}$/);
  });
  it("falls back to portfolio- and 4 letters when the base is too short", async () => {
    expect(await uniqueSlug("")).toMatch(/^portfolio-[a-z]{4}$/);
    expect(await uniqueSlug("ab")).toMatch(/^portfolio-[a-z]{4}$/);
  });
});
