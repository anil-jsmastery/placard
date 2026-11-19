import * as storage from "@/lib/storage";

const USER = /^user_[A-Za-z0-9]+$/;
const FILE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

const notFound = () => new Response("Not found", { status: 404 });

/** Serves an uploaded image (Step 12): `/uploads/{userId}/{id}.webp` only, from Neon Object Storage. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (path.length !== 2 || !USER.test(path[0]) || !FILE.test(path[1])) return notFound();

  const body = await storage.get(`uploads/${path[0]}/${path[1]}`);
  if (!body) return notFound();
  return new Response(body, {
    headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
