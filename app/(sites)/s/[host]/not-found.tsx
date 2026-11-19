import { APP_URL } from "@/lib/config";

/** A host with no published site (or any path other than `/` on a site host). */
export default function SiteNotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-card px-4 text-center text-foreground">
      <div>
        <h1 className="text-2xl font-bold">There&apos;s no site here yet.</h1>
        <a href={`${APP_URL}/?ref=404`} className="mt-4 inline-flex h-10 items-center text-sm font-medium underline underline-offset-4">
          Make your own with Placard
        </a>
      </div>
    </main>
  );
}
