import { describe, expect, it } from "vitest";
import { shapeVisits, visitsWindow } from "./stats";

describe("visitsWindow", () => {
  it("is today and 13 days before, as UTC dates", () => {
    expect(visitsWindow(new Date("2026-11-24T10:00:00Z"))).toEqual({ today: "2026-11-24", from: "2026-11-11" });
  });

  it("uses the UTC date, not the local one", () => {
    expect(visitsWindow(new Date("2026-11-24T23:59:59Z")).today).toBe("2026-11-24");
    expect(visitsWindow(new Date("2026-11-25T00:00:00Z")).today).toBe("2026-11-25");
  });

  it("crosses months and years", () => {
    expect(visitsWindow(new Date("2026-03-05T12:00:00Z"))).toEqual({ today: "2026-03-05", from: "2026-02-20" });
    expect(visitsWindow(new Date("2027-01-02T12:00:00Z")).from).toBe("2026-12-20");
  });
});

describe("shapeVisits", () => {
  const span = { today: "2026-11-24", from: "2026-11-11" };

  it("zero-fills 14 days, oldest first", () => {
    const v = shapeVisits([{ day: "2026-11-13", views: 5, mobile: 2, desktop: 3 }, { day: "2026-11-24", views: 1, mobile: 0, desktop: 1 }], [], span);
    expect(v.daily).toHaveLength(14);
    expect(v.daily[0]).toEqual({ day: "2026-11-11", views: 0 });
    expect(v.daily[2]).toEqual({ day: "2026-11-13", views: 5 });
    expect(v.daily[13]).toEqual({ day: "2026-11-24", views: 1 });
  });

  it("works out device shares that add up to 100", () => {
    const v = shapeVisits([{ day: "2026-11-20", views: 3, mobile: 1, desktop: 2 }], [], span);
    expect(v.mobileShare).toBe(33);
    expect(v.desktopShare).toBe(67);
  });

  it("has no shares with no views", () => {
    const v = shapeVisits([], [], span);
    expect(v.daily.every((d) => d.views === 0)).toBe(true);
    expect([v.mobileShare, v.desktopShare]).toEqual([0, 0]);
  });

  it("passes the referrers through, Direct as an empty host", () => {
    const refs = [{ host: "linkedin.com", views: 4 }, { host: "", views: 2 }];
    expect(shapeVisits([], refs, span).referrers).toEqual(refs);
  });
});
