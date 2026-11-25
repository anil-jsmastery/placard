import { beforeEach, describe, expect, it, vi } from "vitest";
import { REFERENCE_PAGE } from "@/lib/site/sample-pages";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_APP_DOMAIN = "localhost:3000";
});

// A fake sites table: `eq(sites.slug, x)` becomes { value: x }, and the query finds the row with that slug.
const table = vi.hoisted(() => ({ rows: [] as { id: string; slug: string; published: unknown }[], queries: 0 }));
vi.mock("drizzle-orm", () => ({ eq: (_col: unknown, value: unknown) => ({ value }) }));
vi.mock("@/lib/db", () => ({
  sites: { id: "id", slug: "slug", published: "published" },
  db: {
    select: () => ({
      from: () => ({
        where: ({ value }: { value: string }) => ({
          limit: async () => {
            table.queries++;
            return table.rows.filter((r) => r.slug === value);
          },
        }),
      }),
    }),
  },
}));

const { resolveHost } = await import("./resolve");

describe("resolveHost", () => {
  beforeEach(() => {
    table.queries = 0;
    table.rows = [
      { id: "1", slug: "maya-chen", published: REFERENCE_PAGE },
      { id: "2", slug: "sam-okafor", published: null },
    ];
  });

  it("finds a published site by its slug", async () => {
    const site = await resolveHost("maya-chen.localhost:3000");
    expect(site?.slug).toBe("maya-chen");
    expect(site?.published.root.props.title).toBe(REFERENCE_PAGE.root.props.title);
  });
  it("ignores case in the host", async () => {
    expect((await resolveHost("Maya-Chen.LOCALHOST:3000"))?.slug).toBe("maya-chen");
  });
  it("doesn't find an unpublished site", async () => {
    expect(await resolveHost("sam-okafor.localhost:3000")).toBeNull();
  });
  it.each(["a.b.localhost:3000", "example.com", "localhost:3000", "maya-chen.localhost:3001"])("doesn't resolve %s", async (host) => {
    expect(await resolveHost(host)).toBeNull();
    expect(table.queries).toBe(0);
  });
});
