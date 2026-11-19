"use client";

import { useId, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { unpublishSite } from "@/app/(main)/sites/[id]/edit/actions";
import { deleteSite } from "@/app/(main)/(app)/sites/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { updateSlug } from "./actions";

const rowClass = "grid grid-cols-1 gap-4 p-5 sm:p-6 md:grid-cols-[220px_minmax(0,1fr)]";

/** "Site address": the slug with the app domain after it (or `APP_DOMAIN/p/` before it in path mode). */
export function AddressRow({
  siteId,
  slug,
  appDomain,
  sitePaths,
}: {
  siteId: string;
  slug: string;
  appDomain: string;
  sitePaths: boolean;
}) {
  const router = useRouter();
  const inputId = useId();
  const [value, setValue] = useState(slug);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await updateSlug(siteId, value);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setError(null);
      setValue(result.slug);
      toast("Saved");
      router.refresh();
    });
  };

  return (
    <section className={rowClass} aria-labelledby="addr-h">
      <div>
        <h2 id="addr-h" className="font-semibold">Site address</h2>
        <p className="mt-1 text-sm text-muted-foreground">Where your site lives.</p>
      </div>
      <form onSubmit={submit}>
        <label htmlFor={inputId} className="sr-only">Address</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex h-11 min-w-0 items-center overflow-hidden rounded-md border border-input bg-card focus-within:ring-2 focus-within:ring-ring/30 sm:h-10 sm:flex-1">
            {sitePaths ? (
              <span className="flex h-full items-center border-r border-input bg-muted px-3 font-mono text-sm text-muted-foreground">{appDomain}/p/</span>
            ) : null}
            <input
              id={inputId}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${inputId}-help`}
              className="h-full min-w-0 flex-1 bg-transparent pl-3 font-mono text-base outline-none sm:text-sm"
            />
            {sitePaths ? null : (
              <span className="flex h-full items-center border-l border-input bg-muted px-3 font-mono text-sm text-muted-foreground">.{appDomain}</span>
            )}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
          >
            Save
          </button>
        </div>
        {error ? (
          <p id={`${inputId}-help`} className="mt-2 text-sm text-destructive" role="alert">{error}</p>
        ) : (
          <p id={`${inputId}-help`} className="mt-2 text-sm text-muted-foreground">3–30 characters: lowercase letters, numbers and hyphens.</p>
        )}
      </form>
    </section>
  );
}

/** "Publishing": Unpublish when live; otherwise a link to the editor. */
export function PublishingRow({ siteId, live }: { siteId: string; live: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const unpublish = () =>
    startTransition(async () => {
      await unpublishSite(siteId);
      toast("Unpublished. Your site is offline.");
      router.refresh();
    });

  return (
    <section className={rowClass} aria-labelledby="pub-h">
      <div>
        <h2 id="pub-h" className="font-semibold">Publishing</h2>
        <p className="mt-1 text-sm text-muted-foreground">Take the site offline.</p>
      </div>
      {live ? (
        <div>
          <p className="text-sm">
            Your site is live. If you unpublish it, visitors see a “site not found” page until you publish again. Your draft is kept.
          </p>
          <button
            type="button"
            onClick={unpublish}
            disabled={pending}
            className="mt-4 inline-flex h-10 items-center rounded-md border border-input bg-card px-4 text-sm font-semibold hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
          >
            Unpublish
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm">Your site isn&apos;t published yet. Publish it from the editor.</p>
          <Link
            href={`/sites/${siteId}/edit`}
            className="mt-4 inline-flex h-10 items-center rounded-md border border-input bg-card px-4 text-sm font-semibold hover:bg-accent"
          >
            Open editor
          </Link>
        </div>
      )}
    </section>
  );
}

/** "Delete site": AlertDialog, then back to the dashboard. */
export function DeleteRow({ siteId, name }: { siteId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <section className={rowClass} aria-labelledby="del-h">
      <div>
        <h2 id="del-h" className="font-semibold text-destructive">Delete site</h2>
        <p className="mt-1 text-sm text-muted-foreground">This can’t be undone.</p>
      </div>
      <div>
        <p className="text-sm">Deletes the site, its history and its stats, and frees the address.</p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-4 inline-flex h-10 items-center rounded-md bg-destructive px-4 text-sm font-semibold text-white hover:bg-destructive/90"
        >
          Delete site
        </button>
      </div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-bold [overflow-wrap:anywhere]">Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the site, its history and its stats, and frees the address. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  await deleteSite(siteId);
                  router.push("/dashboard");
                });
              }}
            >
              Delete site
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
