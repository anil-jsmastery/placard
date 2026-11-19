import { auth } from "@clerk/nextjs/server";
import { getPlanKey } from "@/lib/plan";
import { PLANS, formatBytes } from "@/lib/plans";
import { uploadsQuery } from "@/lib/realtime/queries";
import { sealOrNull } from "@/lib/realtime/server";
import * as storage from "@/lib/storage";
import { getStorageUsed } from "@/lib/usage";

const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;
const HEADERS = { "Cache-Control": "private, no-store" };

const fail = (error: string, status = 400) => Response.json({ error }, { status, headers: HEADERS });

/**
 * An upload link (Step 12). The browser sends `{ type, size }`; after the checks it gets `{ id, url }` and PUTs the
 * file straight to Neon Object Storage under `incoming/{userId}/{id}`. The Neon Function takes it from there.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return fail("Signed out", 401);

  const body = (await req.json().catch(() => null)) as { type?: unknown; size?: unknown } | null;
  const type = body?.type;
  const size = body?.size;
  if (typeof type !== "string" || !TYPES.has(type)) return fail("Use a JPG, PNG or WebP image.");
  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0 || size > MAX_BYTES) {
    return fail("Images can be up to 5 MB.");
  }

  const [plan, used] = await Promise.all([getPlanKey(), getStorageUsed(userId)]);
  const limit = PLANS[plan].uploadBytes;
  if (used + size > limit) return fail(`You've used your ${formatBytes(limit)} of image storage.`);

  await storage.ensureUploadCors();
  const id = crypto.randomUUID();
  const url = await storage.uploadUrl(`incoming/${userId}/${id}`, { contentType: type, contentLength: size });
  return Response.json({ id, url }, { headers: HEADERS });
}

/** The user's uploads, the `ready` ones' bytes, the plan's limit and the sealed live query (or null). */
export async function GET() {
  const { userId } = await auth();
  if (!userId) return fail("Signed out", 401);

  const query = uploadsQuery(userId);
  const [uploads, plan, sealed] = await Promise.all([query, getPlanKey(), sealOrNull(uploadsQuery(userId))]);
  const used = uploads.filter((u) => u.status === "ready").reduce((total, u) => total + u.bytes, 0);
  return Response.json({ uploads, used, limit: PLANS[plan].uploadBytes, sealed }, { headers: HEADERS });
}
