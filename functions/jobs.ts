// The Neon Function for Placard (Step 12). `npx neon deploy` bundles it and deploys it onto the branch. Two triggers
// in neon.ts call it:
//   POST /uploads  when a file lands in the `uploads` bucket under incoming/ (storage_object_created)
//   POST /cleanup  every night at 03:17 UTC (schedule)
// Neon injects DATABASE_URL and the Object Storage credentials (AWS_*). Neon strips any X-Neon-* header a caller sends,
// so X-Neon-Trigger-Invocation-Id shows the request came from a trigger. An event can arrive more than once, so both
// handlers are idempotent.
import { DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { neon } from "@neondatabase/serverless";
import sharp from "sharp";

const BUCKET = "uploads";
const MAX_BYTES = 5 * 1024 * 1024;
const INCOMING = /^incoming\/(user_[A-Za-z0-9]+)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

const sql = neon(process.env.DATABASE_URL!);
const s3 = new S3Client({ endpoint: process.env.AWS_ENDPOINT_URL_S3, region: process.env.AWS_REGION, forcePathStyle: true });

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST" || !request.headers.get("x-neon-trigger-invocation-id")) {
    return new Response("Not found", { status: 404 });
  }
  const { pathname } = new URL(request.url);
  const event = (await request.json().catch(() => null)) as { data?: { object_key?: string } } | null;
  if (pathname === "/uploads") return processUpload(String(event?.data?.object_key ?? ""));
  if (pathname === "/cleanup") return cleanup();
  return new Response("Not found", { status: 404 });
}

// incoming/{userId}/{id} → uploads/{userId}/{id}.webp (at most 2000 px, WebP quality 80) and an `uploads` row.
async function processUpload(key: string): Promise<Response> {
  const match = INCOMING.exec(key);
  if (!match) return new Response(null, { status: 204 });
  const [, userId, id] = match;
  const done = await sql`select 1 from uploads where id = ${id}`;
  if (done.length) {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })).catch(() => {});
    return new Response(null, { status: 204 });
  }
  let original: Buffer;
  try {
    const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    original = Buffer.from(await object.Body!.transformToByteArray());
  } catch {
    return new Response(null, { status: 204 }); // an earlier delivery already processed and removed it
  }
  const reject = async (error: string) => {
    await sql`insert into uploads (id, user_id, path, bytes, status, error)
              values (${id}, ${userId}, '', 0, 'rejected', ${error}) on conflict (id) do nothing`;
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    return new Response(null, { status: 204 });
  };
  if (original.length > MAX_BYTES) return reject("Images can be up to 5 MB.");
  const format = await sharp(original).metadata().then((m) => m.format, () => undefined);
  if (format !== "jpeg" && format !== "png" && format !== "webp") return reject("Use a JPG, PNG or WebP image.");
  const webp = await sharp(original)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  const path = `/uploads/${userId}/${id}.webp`;
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: path.slice(1), Body: webp, ContentType: "image/webp" }));
  await sql`insert into uploads (id, user_id, path, bytes, status)
            values (${id}, ${userId}, ${path}, ${webp.length}, 'ready') on conflict (id) do nothing`;
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  return new Response(null, { status: 204 });
}

// Nightly: remove incoming/ files older than an hour (uploads that never got processed), mark AI runs still
// "running" after 10 minutes as failed (their server stopped mid-run), and forget rejected uploads after a day.
async function cleanup(): Promise<Response> {
  const cutoff = Date.now() - 60 * 60 * 1000;
  let removed = 0;
  let token: string | undefined;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "incoming/", ContinuationToken: token }));
    for (const object of page.Contents ?? []) {
      if (object.Key && object.LastModified && object.LastModified.getTime() < cutoff) {
        await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: object.Key }));
        removed++;
      }
    }
    token = page.NextContinuationToken;
  } while (token);
  const runs = await sql`update ai_runs set status = 'failed', error = 'timeout'
                         where status = 'running' and created_at < now() - interval '10 minutes' returning id`;
  const rejected = await sql`delete from uploads where status = 'rejected' and created_at < now() - interval '1 day' returning id`;
  return Response.json({ incomingRemoved: removed, runsFailed: runs.length, rejectedForgotten: rejected.length });
}
