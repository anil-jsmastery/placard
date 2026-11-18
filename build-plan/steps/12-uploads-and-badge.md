# Step 12 · Image uploads (Neon Object Storage and Functions) and badge removal

| | |
|---|---|
| Goal | Users replace any image with their own (JPG, PNG or WebP up to 5 MB, within their storage limit). The browser sends it straight to Neon Object Storage, a Neon Function resizes it and converts it to WebP next to the database, and it appears in "Your images" by itself through Neon Realtime. Files branch with the database. Pro users can hide the "Made with Placard" badge; downgrading brings it back |
| Spec | Build order 9 · §3.8 Uploads · §3.7 footer badge · §4 (20 MB / 1 GB, badge removable on Pro) · §6 (`uploads`) |
| Screens | `image-picker-upload.html`, `editor-settings.html` (the badge switch at the end of Site settings) |
| Pages to check | `/sites/{id}/edit`, `/account` |
| MCP | `vercel`, `posthog`, `neon`, `next-devtools`, `playwright` |
| Model | Opus 5.5 · medium effort |

How an upload travels: the picker asks the app for an upload link, sends the file straight to the `uploads` bucket under `incoming/`, and waits. The file landing fires the `uploads` trigger, which calls the `jobs` Neon Function on the same branch: it checks the file, resizes it, writes `uploads/{userId}/{id}.webp`, records the row in `uploads` and removes the original. The picker is subscribed to the user's `uploads` rows (Realtime), so the new image shows up the moment the row does. Because Object Storage branches with Postgres, `dev`'s files and rows stay apart from `main`'s.

## 1. You do first

Nothing before the build. Midway (3.0), Claude Code asks you to put production's Object Storage variables into Vercel.

## 2. Read first

- `image-picker-upload.html`, design-system §6 (upload errors)
- `.claude/skills/neon-object-storage/SKILL.md` and `.claude/skills/neon-functions/SKILL.md`; `node_modules/@neon/config/README.md` ("Shipping a dependency's files (`externalPackages`)")
- `npx neon triggers --help`, `npx neon functions --help`, `npx neon logs query --help`
- The S3 client's types: `PutObjectCommand`, `GetObjectCommand`, `PutBucketCorsCommand` (`@aws-sdk/client-s3`) and `getSignedUrl` (`@aws-sdk/s3-request-presigner`)

## 3. Build

### 3.0 The bucket, the function and its triggers (CLI, `vercel`)
- Write `functions/jobs.ts` (3.4) first, then replace `neon.ts` with the final file: Step 11's plus the bucket, the function and the two triggers.
  ```ts
  import { defineConfig } from "@neon/config/v1";

  // Placard's Neon backend, as code. `npx neon deploy --branch <name>` applies it to a branch.
  export default defineConfig({
    auth: false, // sign-in stays on Clerk
    aiGateway: true, // the models that build and edit sites, and the photo embeddings (Step 5)
    buckets: {
      uploads: { access: "private" }, // users' images (Step 12), served through /uploads/...
    },
    functions: {
      jobs: {
        name: "Placard jobs",
        source: "./functions/jobs.ts",
        externalPackages: ["sharp"], // sharp has a native binary, so it ships beside the bundle
      },
    },
    triggers: {
      uploads: { type: "storage_object_created", function: "jobs", bucket: "uploads", prefix: "incoming/", functionPath: "/uploads", enabled: true },
      cleanup: { type: "schedule", function: "jobs", cron: "17 3 * * *", functionPath: "/cleanup", enabled: true },
    },
    preview: {
      realtime: { allowedOrigins: ["*"] }, // live queries (Step 11); sealed queries are the access check, so any origin may connect
    },
    // main and dev never expire; any other branch made from this policy (a check or a simulation) expires after a day
    branch: (branch) => (branch.isDefault || branch.name === "dev" || branch.exists ? {} : { ttl: "1d" }),
  });
  ```
  ```bash
  npx neon deploy --branch dev
  npx neon env pull -s object-storage > /dev/null
  grep -c '^AWS_ENDPOINT_URL_S3=.' .env.local; grep -c '^AWS_ACCESS_KEY_ID=.' .env.local; grep -c '^AWS_SECRET_ACCESS_KEY=.' .env.local
  npx neon triggers list --branch dev
  ```
  The deploy bundles the function with esbuild and ships `sharp`'s Linux build beside it (the CLI stages it with npm; that takes a minute). `triggers list` must show `uploads` and `cleanup`, both enabled.
- **Production:** say that you're about to create the bucket, the function and its triggers on `main`, then `npx neon deploy --branch main --no-env-pull`. Then hand over to the person, and wait for "done": "In your terminal, run `npx neon env pull --branch main -s object-storage --file .env.vercel`, paste the file into Vercel › Settings › Environment Variables (Production, Sensitive) as in Step 9, then delete `.env.vercel`." Check through `vercel` that the four `AWS_*` names exist for Production. From now on, a change to `functions/` or `neon.ts` goes to production with the same `npx neon deploy --branch main --no-env-pull`, in the step that makes it.

### 3.1 Owner features (cached): `lib/billing.ts`
`getOwnerFeatures(userId)` reads the user's active subscription features with Clerk's backend API (find the billing method in `@clerk/backend`'s types), cached with `unstable_cache` for 5 minutes and tagged `plan:{userId}`. The Clerk webhook (Step 10) calls `revalidateTag("plan:" + userId)` on every billing event. Use it wherever we need the plan of a site's **owner** rather than the visitor: the badge here, custom domains in Step 16.

### 3.2 Storage: `lib/storage/index.ts`
The one door to files (`CLAUDE.md` › "Product rules"); `import "server-only"`. One `S3Client` with `endpoint: AWS_ENDPOINT_URL_S3`, `region: AWS_REGION` and `forcePathStyle: true` (Neon Object Storage takes path-style requests only), bucket `uploads`:
- `get(key)` → the object's body as a web `ReadableStream`, or `null` when it doesn't exist.
- `uploadUrl(key, { contentType, contentLength })` → a presigned `PUT` URL for that key, valid for 5 minutes (`getSignedUrl` with a `PutObjectCommand` carrying `ContentType` and `ContentLength`).
- `ensureUploadCors()` → once per server instance: read the bucket's CORS rules, and if none allows `PUT` from `NEXT_PUBLIC_APP_URL`, write one rule: `AllowedOrigins: [NEXT_PUBLIC_APP_URL]`, `AllowedMethods: ["PUT"]`, `AllowedHeaders: ["content-type"]`, `MaxAgeSeconds: 3600`. CORS is per branch, so `dev` gets `http://localhost:3000` and `main` gets `https://APP_DOMAIN` the first time each hands out a link.
- Keys: `incoming/{userId}/{id}` for files on their way in, `uploads/{userId}/{id}.webp` for finished images (the function writes those). The image `src` saved in pages is always `/uploads/{userId}/{id}.webp`.

### 3.3 Upload API: `app/api/uploads/route.ts`
- `POST` JSON `{ type, size }`: auth; `type` must be `image/jpeg`, `image/png` or `image/webp` ("Use a JPG, PNG or WebP image."), `size` at most 5 MB ("Images can be up to 5 MB."); quota: the user's `ready` uploads' `bytes` plus `size` must be within `PLANS[plan].uploadBytes` ("You've used your 20 MB of image storage." / "…1 GB…"). Then `ensureUploadCors()`, a new `id = crypto.randomUUID()`, and return `{ id, url: await storage.uploadUrl("incoming/{userId}/{id}", { contentType: type, contentLength: size }) }`. Errors are `400 { error }` with the copy above.
- `GET` returns `{ uploads, used, limit, sealed }`: the user's uploads from `uploadsQuery(userId)` (below), `used` = the `ready` ones' bytes, the plan's `limit`, and `sealOrNull(uploadsQuery(userId))`.
- `uploadsQuery(userId)` joins the builders in `lib/realtime/queries.ts` (Step 11): `{ id, path, bytes, status, error, createdAt }` of the user's uploads, newest first, at most 100. `/api/live/[query]` gets the matching name `uploads` (the session's user; no parameters).

### 3.4 The Neon Function: `functions/jobs.ts`
Exactly this. It runs on Neon, not on Vercel, so it reaches Postgres with `@neondatabase/serverless` (the one exception to "the database only through Drizzle", `CLAUDE.md`) and the bucket with the injected `AWS_*` credentials:
```ts
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
```
The processed file goes under `uploads/`, outside the trigger's `incoming/` prefix, so writing it never fires the trigger again.

### 3.5 Serving uploads: `app/uploads/[...path]/route.ts`
Accept only `{userId}/{id}.webp` (reject anything else, including `..`). Stream `storage.get("uploads/" + path)` with `Content-Type: image/webp` and `Cache-Control: public, max-age=31536000, immutable` (Vercel's CDN then serves repeat requests). 404 if missing. In `next.config.ts` add `images.localPatterns` for `/library/**` and `/uploads/**`.

### 3.6 Upload tab in the image picker
Second tab "Upload" in `image-picker.tsx` (`image-picker-upload.html`):
- A dropzone (`rounded-xl border-2 border-dashed border-input p-8 text-center`): `upload` icon, "Drop an image here or", a "browse" text button, and the hint "JPG, PNG or WebP, up to 5 MB". Errors show in `text-destructive text-sm` under the dropzone.
- Picking a file: check type and size in the browser first (same copy as the API), `POST /api/uploads`, then send the file to the returned `url` with `XMLHttpRequest` (`PUT`, header `content-type`), showing a `Progress` bar with the upload's progress and "Uploading…". After the upload, keep "Uploading…" until the user's `uploads` rows contain the new `id`: `ready` → it's selected automatically; `rejected` → show its `error`; nothing within 30 seconds → "That upload didn't go through. Try again."
- Under it, "Your images": `<LiveRows name="uploads">` (Step 11) with the rows from `GET /api/uploads`, `ready` ones only, in the same grid as the library (newest first), and the line "{used} of {limit} used" (MB/GB, one decimal) worked out from the live rows. Without Realtime, the picker re-reads `GET /api/uploads` every 2 seconds while an upload is waiting.
- "Use image" puts the selected `src` in the field. Alt text stays editable in the field.

### 3.7 Account page
The "Image storage" line (Step 10) counts `ready` uploads only.

### 3.8 Badge removal
- Root field `showBadge` → the last row of Site settings (`editor-settings.html`): label "Show “Made with Placard” badge", the "Pro" pill, helper "Shown in your site’s footer.", and a `Switch`.
  - Pro (`has({ feature: "remove_badge" })`): the switch works.
  - Free: the switch is shown on and disabled; clicking the row opens the paywall with reason `remove_badge`.
- Published page and editor canvas: show the badge when `root.props.showBadge` is true **or** the owner doesn't have `remove_badge` (`getOwnerFeatures`).
- `onDowngrade`: `revalidateTag("plan:" + userId)` (already done by the webhook) so the badge comes back within the cache window.

## 4. Responsive

- Upload tab at 360: the dropzone fits; "browse" opens the phone's photo picker (`accept="image/jpeg,image/png,image/webp"`); the uploads grid is 2 columns.
- The badge switch row keeps the label, "Pro" pill and switch on one line at 280 px panel width (the label wraps).

## 5. Check it works

- [ ] On `dev`: upload a 4.8 MB JPG from a phone-sized window. The network log shows the file going in one `PUT` straight to the Neon storage endpoint (not to `/api`), the image appears in "Your images" and is selected within a few seconds without a reload, `uploads` on `dev` has its row with `status = ready` (through `neon`), the served file is a WebP at most 2000 px on its longer side, and it works in Hero, About, Gallery and Testimonials avatars and on the published site
- [ ] The function ran it: `npx neon logs query --branch dev` (or the Neon Console's Functions logs) shows the `/uploads` invocation; `npx neon triggers list --branch dev` shows `uploads` and `cleanup` enabled (paste both)
- [ ] Refused: a 6 MB file (the picker and `POST /api/uploads` both refuse it), a PDF renamed to `.jpg` (the function marks it `rejected` and the picker shows "Use a JPG, PNG or WebP image."), `/uploads/../../etc/passwd`, and a `POST` to the function's invocation URL (`npx neon functions get jobs --branch dev`) without the trigger header, which gets 404 (paste the responses)
- [ ] A Free user near 20 MB gets the storage message; the `ready` uploads' total matches the account page's "Image storage"
- [ ] Branches keep files apart: an image uploaded on `dev` isn't in `main`'s bucket, and `GET /uploads/...` for it on production is a 404
- [ ] Pro: turning the switch off removes the badge from the live site after Publish; Free: the switch is locked and opens the `remove_badge` paywall (link to `paywall_shown`)
- [ ] After a Pro → Free downgrade, the badge is back on the live site within 5 minutes
- [ ] typecheck, lint, build pass
- [ ] **(prod)** The deployment is Ready with no runtime errors since (`vercel`, links); the four `AWS_*` variables exist for Production (names); the same upload works on production, the page's `src` is `/uploads/{userId}/{id}.webp`, and its `uploads` row on `main` is `ready` (paste it, from `neon`); `npx neon triggers list --branch main` shows both triggers enabled
- [ ] **(prod)** A preview gets its own copy of the files: `git switch -c preview-files`, `git commit --allow-empty -m "preview files"`, `git push -u origin preview-files`, and follow the preview deployment with `vercel` until it's Ready (its build log shows `neon deploy` creating the bucket, the function and its triggers on `preview/preview-files`). Open the preview URL through `vercel`, sign in with your development test account, build a small site and replace one image with an upload: it appears in "Your images" live. Through `neon`: `preview/preview-files`'s `uploads` has the new row with `status = ready`, and `main`'s `uploads` count is the same as before (paste both queries and the Console links); production's `GET /uploads/...` for that key is a 404. Then clean up as in Step 9: `git switch main`, `git push origin --delete preview-files`, `git branch -D preview-files`, and delete `preview/preview-files` through `neon`
- [ ] `node scripts/check-responsive.mjs` passes for the pages to check at all six widths, and its screenshots match the reference at 390, 768 and 1440 (1024 for editor screens)

## 6. Commit

`step 12: image uploads (neon object storage, neon function, live list) and badge removal`

## 7. Memory

`/step` adds this block to `MEMORY.md`, word for word, right before the commit:

```md
## Step 12 · Image uploads (Neon Object Storage and Functions) and badge removal
- Uploads go from the browser straight to Neon Object Storage (`app/api/uploads/route.ts`); the Neon Function `functions/jobs.ts` converts them to WebP and records them in `uploads`; `app/uploads/[...path]` serves them. Files branch with the database.
- "Your images" in the image picker updates live through Realtime; the account page shows storage use.
- `lib/billing.ts` caches each owner's features. Pro can hide the "Made with Placard" badge; downgrading brings it back.
```
