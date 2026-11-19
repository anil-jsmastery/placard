import "server-only";
import {
  GetBucketCorsCommand,
  GetObjectCommand,
  PutBucketCorsCommand,
  PutObjectCommand,
  S3Client,
  type CORSRule,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APP_URL } from "@/lib/config";

// Neon Object Storage (Step 12): the one door to files. The bucket branches with the database, so each branch's
// `AWS_*` variables reach its own copy of the files. Keys:
//   incoming/{userId}/{id}       files on their way in (the browser PUTs them with a link from uploadUrl)
//   uploads/{userId}/{id}.webp   finished images (written by the Neon Function `functions/jobs.ts`)
// The image `src` saved in pages is always `/uploads/{userId}/{id}.webp`, served by app/uploads/[...path].

const BUCKET = "uploads";

// Neon Object Storage takes path-style requests only
const s3 = new S3Client({
  endpoint: process.env.AWS_ENDPOINT_URL_S3,
  region: process.env.AWS_REGION,
  forcePathStyle: true,
});

/** The object's body as a web stream, or null when it doesn't exist. */
export async function get(key: string): Promise<ReadableStream | null> {
  try {
    const object = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    return object.Body ? object.Body.transformToWebStream() : null;
  } catch (error) {
    const name = (error as { name?: string }).name;
    if (name === "NoSuchKey" || name === "NotFound") return null;
    throw error;
  }
}

/** A presigned PUT link for `key`, valid for 5 minutes, bound to the file's type and size. */
export function uploadUrl(key: string, { contentType, contentLength }: { contentType: string; contentLength: number }) {
  return getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType, ContentLength: contentLength }),
    { expiresIn: 5 * 60 },
  );
}

const allowsPut = (rule: CORSRule, origin: string) =>
  (rule.AllowedOrigins ?? []).some((o) => o === origin || o === "*") &&
  (rule.AllowedMethods ?? []).some((m) => m.toUpperCase() === "PUT");

let corsReady: Promise<void> | null = null;

/**
 * Once per server instance: makes sure the bucket lets the app's origin PUT files from the browser. CORS is per
 * branch, so `dev` gets http://localhost:3000 and `main` the production address the first time each hands out a link.
 */
export function ensureUploadCors(): Promise<void> {
  corsReady ??= (async () => {
    const origin = new URL(APP_URL).origin;
    let rules: CORSRule[] = [];
    try {
      rules = (await s3.send(new GetBucketCorsCommand({ Bucket: BUCKET }))).CORSRules ?? [];
    } catch (error) {
      if ((error as { name?: string }).name !== "NoSuchCORSConfiguration") throw error;
    }
    if (rules.some((rule) => allowsPut(rule, origin))) return;
    await s3.send(
      new PutBucketCorsCommand({
        Bucket: BUCKET,
        CORSConfiguration: {
          CORSRules: [{ AllowedOrigins: [origin], AllowedMethods: ["PUT"], AllowedHeaders: ["content-type"], MaxAgeSeconds: 3600 }],
        },
      }),
    );
  })().catch((error) => {
    corsReady = null; // try again on the next upload
    throw error;
  });
  return corsReady;
}
