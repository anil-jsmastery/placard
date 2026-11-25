import { beforeEach, describe, expect, it, vi } from "vitest";

const rows = vi.hoisted(() => ({ users: [] as { id: string }[] }));
const analytics = vi.hoisted(() => ({ captureServer: vi.fn(), setPersonServer: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/analytics/server", () => analytics);
vi.mock("@/lib/db", () => {
  const chain = { from: () => chain, where: () => chain, limit: async () => rows.users };
  return { db: { select: () => chain }, users: { id: "id" } };
});

import { handleBillingEvent } from "./billing";

const item = (type: string, userId = "user_1", slug = "pro") => ({ type, data: { plan: { slug }, payer: { user_id: userId } } });

describe("handleBillingEvent", () => {
  beforeEach(() => {
    rows.users = [{ id: "user_1" }];
    analytics.captureServer.mockReset();
    analytics.setPersonServer.mockReset();
  });

  it("sends subscription_started and sets plan = pro when Pro becomes active", async () => {
    expect(await handleBillingEvent(item("subscriptionItem.active"))).toBe("started");
    expect(analytics.captureServer).toHaveBeenCalledWith("user_1", "subscription_started", { plan: "pro" }, { personSet: { plan: "pro" } });
  });

  it("sends subscription_canceled when Pro is canceled", async () => {
    expect(await handleBillingEvent(item("subscriptionItem.canceled"))).toBe("canceled");
    expect(analytics.captureServer).toHaveBeenCalledWith("user_1", "subscription_canceled", { plan: "pro" });
    expect(analytics.setPersonServer).not.toHaveBeenCalled();
  });

  it("sets plan = free when Pro ends", async () => {
    expect(await handleBillingEvent(item("subscriptionItem.ended"))).toBe("ended");
    expect(analytics.setPersonServer).toHaveBeenCalledWith("user_1", { plan: "free" });
    expect(analytics.captureServer).not.toHaveBeenCalled();
  });

  it("ignores a user with no users row in this database", async () => {
    rows.users = [];
    expect(await handleBillingEvent(item("subscriptionItem.active", "user_elsewhere"))).toBe("ignored");
    expect(analytics.captureServer).not.toHaveBeenCalled();
    expect(analytics.setPersonServer).not.toHaveBeenCalled();
  });

  it("ignores other plans and other events", async () => {
    expect(await handleBillingEvent(item("subscriptionItem.active", "user_1", "free_user"))).toBe("ignored");
    expect(await handleBillingEvent(item("user.created"))).toBe("ignored");
    expect(analytics.captureServer).not.toHaveBeenCalled();
  });
});
