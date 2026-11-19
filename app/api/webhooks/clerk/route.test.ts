import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const { verifyWebhook, upsertUser, captureServer } = vi.hoisted(() => ({
  verifyWebhook: vi.fn(),
  upsertUser: vi.fn(),
  captureServer: vi.fn(),
}));

vi.mock("@clerk/nextjs/webhooks", () => ({ verifyWebhook }));
vi.mock("@/lib/users", () => ({ upsertUser }));
vi.mock("@/lib/analytics/server", () => ({ captureServer }));
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
