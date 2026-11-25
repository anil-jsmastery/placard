# Step 10 · Photos: the image picker, uploads (Neon Object Storage and Functions) and badge removal

| | |
|---|---|
| Goal | The image picker from the prototype: search the 60 library photos with Lakebase Search, or upload your own work (JPG, PNG or WebP up to 5 MB, within the storage limit). The browser sends the file straight to Neon Object Storage; a Neon Function converts it to WebP next to the database; it appears in "Your uploads" by itself through Realtime. Files branch with the database. Pro users can hide the "Made with Placard" badge |
| Spec | Build order 10 · §3.9 Photos · §3.7 (badge) · §4 · §6 (`uploads`) |
| Screens | `placard-app.html` `#picker` and the badge row in Site settings · screenshots `image-picker`, `image-picker-upload`, `paywall-remove-badge` |
| Tools (for building) | MCP: `neon` (Object Storage and Functions docs), `next-devtools` · Skills: `neon-object-storage`, `neon-functions`, `neon-realtime`, `clerk-billing` · CLIs: drizzle-kit, `npx neon deploy --help` (read only) |
| Model | Opus 5.5 · medium effort |

How an upload travels: the picker asks the app for an upload link, sends the file straight to the `uploads` bucket under `incoming/`, and waits. The file landing fires the `uploads` trigger, which calls the `jobs` Neon Function on the same branch: it checks the file, resizes it, writes `uploads/{userId}/{id}.webp`, records the row in `uploads` and removes the original. The picker is subscribed to the user's `uploads` rows (Realtime), so the new photo shows up the moment the row does. Because Object Storage branches with Postgres, `dev`'s files and rows stay apart from `production`'s.

## 1. Before you run `/step 10` (you)

Nothing.

## 2. Read first (Claude Code)

- `screens/placard-app.html` (`#picker`, `.pick*`, `.drop`, `.up-bar`, `.stor`, the badge `.lock-row`), design-system §7 (upload errors) and §9 (`storage`, `remove_badge`)
- `.claude/skills/neon-object-storage/SKILL.md`, `.claude/skills/neon-functions/SKILL.md`; `node_modules/@neon/config/README.md` ("Shipping a dependency's files (`externalPackages`)")
- The S3 client's types: `PutObjectCommand`, `GetObjectCommand`, `PutBucketCorsCommand` and `getSignedUrl`

## 3. Build (Claude Code)

### 3.0 The bucket, the function and its triggers in `neon.ts`
Write `functions/jobs.ts` (3.4) first, then replace `neon.ts` with the final file: Step 9's plus the bucket, the function and the two triggers. The person deploys it in "Your turn".
  ```ts
  import { defineConfig } from "@neon/config/v1";

  // Placard's Neon backend, as code. `npx neon deploy --branch <name>` applies it to a branch.
  export default defineConfig({
    auth: false, // sign-in stays on Clerk
    aiGateway: true, // the models that build, edit and prettify portfolios, and the photo embeddings (Step 4)
    buckets: {
      uploads: { access: "private" }, // users' images (Step 10), served through /uploads/...
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
      realtime: { allowedOrigins: ["*"] }, // live queries (Step 9); sealed queries are the access check, so any origin may connect
    },
    // production (the default branch) and dev never expire; any other branch made from this policy (a check or a simulation) expires after a day
    branch: (branch) => (branch.isDefault || branch.name === "dev" || branch.exists ? {} : { ttl: "1d" }),
  });
  ```

### 3.1 Owner features (cached): `lib/billing.ts`
`getOwnerFeatures(userId)` reads the user's active subscription features with Clerk's backend API (find the billing method in `@clerk/backend`'s types), cached with `unstable_cache` for 5 minutes and tagged `plan:{userId}`. The Clerk webhook (Step 8) calls `revalidateTag("plan:" + userId)` on every billing event. Use it wherever we need the plan of a site's **owner** rather than the visitor: the badge here.

### 3.2 Storage: `lib/storage/index.ts`
The one door to files (`CLAUDE.md` › "Product rules"); `import "server-only"`. One `S3Client` with `endpoint: AWS_ENDPOINT_URL_S3`, `region: AWS_REGION` and `forcePathStyle: true` (Neon Object Storage takes path-style requests only), bucket `uploads`:
- `get(key)` → the object's body as a web `ReadableStream`, or `null` when it doesn't exist.
- `uploadUrl(key, { contentType, contentLength })` → a presigned `PUT` URL for that key, valid for 5 minutes (`getSignedUrl` with a `PutObjectCommand` carrying `ContentType` and `ContentLength`).
- `ensureUploadCors()` → once per server instance: read the bucket's CORS rules, and if none allows `PUT` from `NEXT_PUBLIC_APP_URL`, write one rule: `AllowedOrigins: [NEXT_PUBLIC_APP_URL]`, `AllowedMethods: ["PUT"]`, `AllowedHeaders: ["content-type"]`, `MaxAgeSeconds: 3600`. CORS is per branch, so `dev` gets `http://localhost:3000` and `production` gets `https://APP_DOMAIN` the first time each hands out a link.
- Keys: `incoming/{userId}/{id}` for files on their way in, `uploads/{userId}/{id}.webp` for finished images (the function writes those). The image `src` saved in pages is always `/uploads/{userId}/{id}.webp`.

### 3.3 Upload API: `app/api/uploads/route.ts`
- `POST` JSON `{ type, size }`: auth; `type` must be `image/jpeg`, `image/png` or `image/webp` ("Use a JPG, PNG or WebP image."), `size` at most 5 MB ("Photos can be up to 5 MB."); quota: the user's `ready` uploads' `bytes` plus `size` must be within `PLANS[plan].uploadBytes`, else `402 { code: "storage" }` (the picker opens the paywall with reason `storage`). Then `ensureUploadCors()`, a new `id = crypto.randomUUID()`, and return `{ id, url: await storage.uploadUrl("incoming/{userId}/{id}", { contentType: type, contentLength: size }) }`. Errors are `400 { error }` with the copy above.
- `GET` returns `{ uploads, used, limit, sealed }`: the user's uploads from `uploadsQuery(userId)` (below), `used` = the `ready` ones' bytes, the plan's `limit`, and `sealOrNull(uploadsQuery(userId))`.
- `uploadsQuery(userId)` joins the builders in `lib/realtime/queries.ts` (Step 9): `{ id, path, bytes, status, error, createdAt }` of the user's uploads, newest first, at most 100. `/api/live/[query]` gets the matching name `uploads` (the session's user; no parameters).

### 3.4 The Neon Function: `functions/jobs.ts`
Exactly this. It runs on Neon, not on Vercel, so it reaches Postgres with `@neondatabase/serverless` (the one exception to "the database only through Drizzle", `CLAUDE.md`) and the bucket with the injected `AWS_*` credentials:
```ts
// The Neon Function for Placard (Step 10). `npx neon deploy` bundles it and deploys it onto the branch. Two triggers
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
  if (original.length > MAX_BYTES) return reject("Photos can be up to 5 MB.");
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

### 3.6 The image picker
`components/editor/image-picker.tsx` replaces Step 3's library-only dialog: the prototype's `#picker` in a shadcn `Dialog` (`.modal-bg`, `.shell.modal.pick`). Every image field opens it (`.img-f`'s Choose / Change), with the field's current photo selected.
- **Header:** "Choose a photo", the `.seg` tabs **Library** and **Your uploads**, the close button.
- **Library:** `.pick-search` ("Search 60 free photos: desk, mountains, coffee…"). Typing (debounced 300 ms) calls the server action `searchLibrary(q)`, which runs `searchImages(q, { count: 24 })` (Step 4, Lakebase Search) for the user; an empty query shows the whole library in file order. The `.pick-tags` chips (all and the 6 tags) filter the results. `.pick-grid` of 5 columns; the selected photo gets the blue ring and the check. "No photos match that. Try another word." when nothing comes back.
- **Your uploads:** the `.drop` box ("Upload your own photo" / "JPG, PNG or WebP up to 5 MB. We resize it for the web." / "Choose a file", and drag and drop onto it). Picking a file: check type and size in the browser first (same copy as the API), `POST /api/uploads`, then send the file to the returned `url` with `XMLHttpRequest` (`PUT`, header `content-type`), filling `.up-bar`. Then a **"Processing…" tile** (a muted square with a small spinner) stands first in the grid until the user's `uploads` rows contain the new `id`: `ready` → it replaces the tile and is selected; `rejected` → the tile goes and its `error` shows under the drop box. There's no time limit: Neon's trigger usually calls the function within seconds but can take minutes, and Realtime brings the row whenever it lands. The dialog can be closed meanwhile; the photo is in "Your uploads" next time. The grid is `<LiveRows name="uploads">` (Step 9) with the rows from `GET /api/uploads`, `ready` ones only, newest first, each with the "Yours" tag. Without Realtime, the picker re-reads `GET /api/uploads` every 2 seconds while an upload is waiting. With no uploads: "Nothing uploaded yet. Your photos show up here."
- **Footer:** `.stor` with the meter and "{used} of {limit} used" (MB/GB, one decimal, from the live rows), "Cancel" and "Use photo" (disabled until something is selected). "Use photo" puts `{ src, alt }` in the field (alt from the library, or "Your photo" for uploads, editable in the field).

### 3.7 Account page
The "Photo storage" line (Step 8) counts `ready` uploads only.

### 3.8 Badge removal
- `showBadge` → the last row of Site settings, the prototype's `.lock-row`: "“Made with Placard” badge", the note and the `.switch` (`role="switch"`).
  - Pro (`has({ feature: "remove_badge" })`): note "Shown in your portfolio’s footer"; the switch works.
  - Free: note "Free portfolios always show it" with the "Pro" tag; the switch is shown on and `aria-disabled`; clicking it opens the paywall with reason `remove_badge`.
- Published page and editor canvas: show the badge when `root.props.showBadge` is true **or** the owner doesn't have `remove_badge` (`getOwnerFeatures`).
- `onDowngrade`: `revalidateTag("plan:" + userId)` (already done by the webhook) so the badge comes back within the cache window.

## 4. Code checks (Claude Code)

`npm test` (unit tests for the `/uploads/[...path]` route's path check and the upload API's type, size and quota checks, storage mocked), `npm run typecheck`, `npm run lint`, `npm run build` pass. `functions/jobs.ts` is exactly 3.4.

## 5. Your turn

**1 · Deploy the bucket and the function to `dev`.**
```bash
npx neon deploy --branch dev
npx neon env pull -s object-storage
npx neon triggers list --branch dev
```
The deploy bundles `functions/jobs.ts` and ships `sharp`'s Linux build beside it (a minute). `triggers list` shows `uploads` (a file landing under `incoming/`) and `cleanup` (03:17 UTC every night). Open `neon.ts`: the bucket, the function and the triggers, as code. Restart `npm run dev`.

**2 · Search the library.** In the editor, select the Intro › Photo › **Change**. Type `mountains`, then `someone at a desk`: Lakebase Search from Step 4, now in the picker. Click a tag chip to narrow it.

**3 · Upload.** Switch to **Your uploads** › **Choose a file** › a photo of your own work (under 5 MB).
- The bar fills; then a "Processing…" tile. The browser sent the file straight to Neon's storage: DevTools › Network shows it (one `PUT` to the Neon endpoint, not to `/api`).
- The photo appears in the grid with "Yours" and is selected by itself (Realtime). **Use photo**: it's in the Intro, served as a WebP from `/uploads/…`. Press Prettify: it restyles around your photo but never replaces it.
- If it takes a while: Neon's trigger can take a minute or more to call the function. That's why the picker waits for the row instead of a timer.

**4 · The function's side.** `npx neon logs query --branch dev` (or Neon Console › Functions › jobs › Logs): the `/uploads` invocation. Neon SQL Editor on `dev`: `select path, bytes, status from uploads order by created_at desc;`.

**5 · Refusals.** Try a 6 MB file (refused before upload) and a PDF renamed `.jpg` (the function marks it rejected: "Use a JPG, PNG or WebP image.").

**6 · Branching with files.** Neon Console › `production` › Object Storage: `dev`'s photo isn't there: files branch with the database, so a preview or the swarm (Step 13) never touches production's files.

**7 · The badge.** Site settings › the last row, "“Made with Placard” badge": as Pro, switch it off and **Update site**: the live portfolio has no badge. As a Free user the switch is locked and opens the paywall (`reason = remove_badge`).

**8 · The security review: CodeRabbit Secure.** Uploads are the riskiest code in Placard: a stranger's file, a signed link into your storage, and a function that opens the file. Open the pull request: `git push -u origin step-10`, `gh pr create --fill-first`, `gh pr view --web`.
1. CodeRabbit's review on the pull request: find what it says about `app/api/uploads/route.ts`, `lib/storage/` and `functions/jobs.ts`. `.coderabbit.yaml` asks it to check what matters here: the upload link allows one content type and at most 5 MB, the file's key sits under the user's own folder, the user owns the site, and the function re-checks the real file type.
2. app.coderabbit.ai › **Security** › **PR security reviews** › this pull request. Each finding has a severity, a **reachability** tier (can a request actually get there?) and an **exploitability** tier (what could an attacker do with it?). Open one and read its evidence. A rules-based scanner matches patterns; this reasons about your app, for example whether a signed-in user could upload into someone else's site.
3. If a finding is real, tell Claude Code `Fix CodeRabbit's review on PR #<number>`, `git push`, and watch the re-review mark it fixed. If there are none, that's the result you want: it's what the checks in this step are for.

If **PR security reviews** isn't in your Security menu yet, CodeRabbit's normal review still comments on security issues in the pull request.

**9 · Production.**
```bash
npx neon deploy --branch production --no-env-pull
npx neon env pull --branch production -s object-storage --file .env.vercel
```
Paste into Vercel Production as Sensitive, `rm .env.vercel`, then `gh pr merge --squash --delete-branch` and `git switch main && git pull`. When production is Ready, upload a photo on production. This ships the step.

**You should see:** the picker as in `image-picker-1440.png` and `image-picker-upload-1440.png`; the photo in "Your uploads" without a reload; an `uploads` row with `status = ready`; both triggers enabled; CodeRabbit's security review on the pull request.

Next: `/clear`, then `/step 11`.

## 6. Commit

`step 10: image picker, uploads (neon object storage, neon function, live list), badge removal`

## 7. Memory

```md
## Step 10 · Photos: the image picker, uploads and badge removal
- Uploads go from the browser straight to Neon Object Storage (`app/api/uploads/route.ts`); the Neon Function `functions/jobs.ts` converts them to WebP and records them in `uploads`; `app/uploads/[...path]` serves them. `neon.ts` declares the bucket, the function and its triggers. Files branch with the database.
- The image picker (`components/editor/image-picker.tsx`) searches the library with Lakebase Search and lists "Your uploads" live through Realtime, with a "Processing…" tile until the function's row lands; the account page shows storage use; a full storage opens the paywall (`storage`).
- `lib/billing.ts` caches each owner's features. Pro can hide the "Made with Placard" badge; downgrading brings it back.
```
