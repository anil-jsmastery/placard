import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ userId: "user_1" as string | null, features: new Set<string>(), realtimeOn: true }));
const seal = vi.hoisted(() => vi.fn(async ({ query }: { query: unknown }) => ({ capability: "cap", queryFingerprint: "fp", expiresAt: 1, query })));
const queries = vi.hoisted(() => ({
  siteViewsQuery: vi.fn((userId: string) => ({ q: "site-views", userId })),
  visitsDailyQuery: vi.fn((userId: string, from: string) => ({ q: "visits-daily", userId, from })),
  visitsReferrersQuery: vi.fn((userId: string, from: string) => ({ q: "visits-referrers", userId, from })),
  aiUsedQuery: vi.fn((userId: string, monthStart: Date) => ({ q: "ai-used", userId, monthStart })),
}));

vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: async () => ({ userId: state.userId }) }));
vi.mock("@/lib/plan", () => ({ hasFeature: async (f: string) => state.features.has(f) }));
vi.mock("@/lib/realtime/queries", () => queries);
vi.mock("@/lib/realtime/server", () => ({
  get realtime() {
    return state.realtimeOn ? { seal } : null;
  },
}));
vi.mock("@/lib/usage", () => ({ monthStartUtc: (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)) }));

import { POST } from "./route";

const call = (name: string, body: unknown = {}) =>
  POST(new Request(`http://localhost/api/live/${name}`, { method: "POST", body: JSON.stringify(body) }), {
    params: Promise.resolve({ query: name }),
  });

describe("POST /api/live/[query]", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-24T10:00:00Z"));
    state.userId = "user_1";
    state.features = new Set();
    state.realtimeOn = true;
    seal.mockClear();
    Object.values(queries).forEach((q) => q.mockClear());
  });
  afterEach(() => vi.useRealTimers());

  it("needs a signed-in user", async () => {
    state.userId = null;
    expect((await call("site-views")).status).toBe(401);
    expect(seal).not.toHaveBeenCalled();
  });

  it("404s an unknown query", async () => {
    expect((await call("uploads-everyone")).status).toBe(404);
  });

  it("503s when Realtime is off", async () => {
    state.realtimeOn = false;
    expect((await call("site-views")).status).toBe(503);
  });

  it("seals site-views for the session's user only, uncached", async () => {
    const res = await call("site-views", { userId: "user_2" });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(queries.siteViewsQuery).toHaveBeenCalledWith("user_1");
    expect((await res.json()).queryFingerprint).toBe("fp");
  });

  it("refuses the 14-day stats without full_stats", async () => {
    expect((await call("visits-daily", { from: "2026-11-11" })).status).toBe(403);
    expect((await call("visits-referrers", { from: "2026-11-11" })).status).toBe(403);
    expect(seal).not.toHaveBeenCalled();
  });

  it("seals the 14-day stats on Pro for a from within the last 15 days", async () => {
    state.features.add("full_stats");
    expect((await call("visits-daily", { from: "2026-11-11" })).status).toBe(200);
    expect(queries.visitsDailyQuery).toHaveBeenCalledWith("user_1", "2026-11-11");
    expect((await call("visits-referrers", { from: "2026-11-09" })).status).toBe(200);
    expect(queries.visitsReferrersQuery).toHaveBeenCalledWith("user_1", "2026-11-09");
  });

  it("rejects a from that isn't a real date in the last 15 days", async () => {
    state.features.add("full_stats");
    for (const from of [undefined, "2026-11-08", "2026-11-25", "2026-02-30", "11/11/2026", "2026-11-11T00:00:00Z"]) {
      expect((await call("visits-daily", { from })).status).toBe(400);
    }
    expect(seal).not.toHaveBeenCalled();
  });

  it("seals ai-used for the 1st of this month or last month only", async () => {
    expect((await call("ai-used", { monthStart: "2026-11-01T00:00:00.000Z" })).status).toBe(200);
    expect(queries.aiUsedQuery).toHaveBeenCalledWith("user_1", new Date("2026-11-01T00:00:00Z"));
    expect((await call("ai-used", { monthStart: "2026-10-01T00:00:00.000Z" })).status).toBe(200);
    for (const monthStart of [undefined, "2026-09-01T00:00:00.000Z", "2026-11-02T00:00:00.000Z", "2026-11-01T01:00:00.000Z", "soon"]) {
      expect((await call("ai-used", { monthStart })).status).toBe(400);
    }
  });
});
