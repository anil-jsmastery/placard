import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { verifyWebhook, upsertUser, userExists, captureServer, setPersonServer, onDowngrade, hasOtherActivePro } = vi.hoisted(() => ({
  verifyWebhook: vi.fn(),
  upsertUser: vi.fn(),
  userExists: vi.fn(),
  captureServer: vi.fn(),
  setPersonServer: vi.fn(),
  onDowngrade: vi.fn(),
  hasOtherActivePro: vi.fn(),
}));

vi.mock("@clerk/nextjs/webhooks", () => ({ verifyWebhook }));
vi.mock("@/lib/users", () => ({ upsertUser, userExists }));
vi.mock("@/lib/analytics/server", () => ({ captureServer, setPersonServer }));
vi.mock("@/lib/billing", () => ({ onDowngrade, hasOtherActivePro, revalidatePlan: vi.fn() }));
vi.mock("@/lib/config", () => ({ APP_ENV: "dev" }));

import { POST } from "./route";

function userCreated(unsafe_metadata: Record<string, unknown>) {
  return {
    type: "user.created",
    data: {
      id: "user_test",
      primary_email_address_id: "idn_1",
      email_addresses: [{ id: "idn_1", email_address: "someone+clerk_test@example.com" }],
      unsafe_metadata,
    },
  };
}

const req = {} as NextRequest;

describe("Clerk webhook, user.created", () => {
  beforeEach(() => vi.clearAllMocks());

  it("ignores a sign-up tagged with the other environment", async () => {
    verifyWebhook.mockResolvedValue(userCreated({ environment: "prod" }));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(upsertUser).not.toHaveBeenCalled();
    expect(captureServer).not.toHaveBeenCalled();
  });

  it("handles a sign-up tagged with this environment", async () => {
    verifyWebhook.mockResolvedValue(userCreated({ environment: "dev" }));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(upsertUser).toHaveBeenCalledWith("user_test", "someone+clerk_test@example.com");
    expect(captureServer).toHaveBeenCalledWith("user_test", "signed_up", {});
  });

  it("handles a sign-up without a tag as before", async () => {
    verifyWebhook.mockResolvedValue(userCreated({}));
    await POST(req);
    expect(upsertUser).toHaveBeenCalledTimes(1);
    expect(captureServer).toHaveBeenCalledTimes(1);
  });
});

function subscriptionItem(type: string, slug = "pro") {
  return { type, data: { id: "csubi_old", payer: { user_id: "user_test" }, plan: { slug } } };
}

describe("Clerk webhook, billing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userExists.mockResolvedValue(true);
    hasOtherActivePro.mockResolvedValue(false);
  });

  it("ignores a billing event for a user this database doesn't have", async () => {
    userExists.mockResolvedValue(false);
    verifyWebhook.mockResolvedValue(subscriptionItem("subscriptionItem.active"));
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(captureServer).not.toHaveBeenCalled();
  });

  it("ignores the free plan's items", async () => {
    verifyWebhook.mockResolvedValue(subscriptionItem("subscriptionItem.active", "free_user"));
    await POST(req);
    expect(captureServer).not.toHaveBeenCalled();
    expect(userExists).not.toHaveBeenCalled();
  });

  it("sends subscription_started and sets plan = pro when Pro becomes active", async () => {
    verifyWebhook.mockResolvedValue(subscriptionItem("subscriptionItem.active"));
    await POST(req);
    expect(captureServer).toHaveBeenCalledWith("user_test", "subscription_started", { plan: "pro" }, { personSet: { plan: "pro" } });
  });

  it("sends subscription_canceled when Pro is canceled", async () => {
    verifyWebhook.mockResolvedValue(subscriptionItem("subscriptionItem.canceled"));
    await POST(req);
    expect(captureServer).toHaveBeenCalledWith("user_test", "subscription_canceled", { plan: "pro" });
  });

  it("sets plan = free and runs onDowngrade when Pro ends", async () => {
    verifyWebhook.mockResolvedValue(subscriptionItem("subscriptionItem.ended"));
    await POST(req);
    expect(setPersonServer).toHaveBeenCalledWith("user_test", { plan: "free" });
    expect(onDowngrade).toHaveBeenCalledWith("user_test");
    expect(captureServer).not.toHaveBeenCalled();
  });

  it("keeps Pro when a late `ended` arrives for an old item and another Pro item is active", async () => {
    hasOtherActivePro.mockResolvedValue(true);
    verifyWebhook.mockResolvedValue(subscriptionItem("subscriptionItem.ended"));
    await POST(req);
    expect(hasOtherActivePro).toHaveBeenCalledWith("user_test", "csubi_old");
    expect(setPersonServer).not.toHaveBeenCalled();
    expect(onDowngrade).not.toHaveBeenCalled();
  });
});
