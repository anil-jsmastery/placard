"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Check, Copy, ExternalLink, X } from "lucide-react";
import { Dialog, DialogClose, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";

const CONFETTI = {
  particleCount: 90,
  spread: 70,
  origin: { y: 0.35 },
  colors: ["#ffd43b", "#16181d", "#16794a", "#8ea6ff", "#c23e22"],
  disableForReducedMotion: true,
};

/** The first-publish dialog (publish-dialog.html): confetti once, the live link with Copy, View site, Done. */
export function PublishDialog({
  open,
  onOpenChange,
  url,
  siteId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  siteId: string;
}) {
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    import("canvas-confetti").then(({ default: confetti }) => {
      if (!cancelled) confetti(CONFETTI);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => () => {
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-40 bg-black/45 supports-backdrop-filter:backdrop-blur-none" />
        <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card shadow-xl outline-none">
          <DialogClose
            className="absolute top-2 right-2 grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:top-3 sm:right-3 sm:size-8"
            aria-label="Close"
          >
            <X className="size-4" aria-hidden="true" />
          </DialogClose>
          <div className="relative p-6">
            <span className="grid size-12 place-items-center rounded-full bg-live-soft text-live">
              <Check className="size-6" aria-hidden="true" />
            </span>
            <DialogTitle className="mt-5 font-display text-2xl font-bold">Published</DialogTitle>
            <DialogDescription className="mt-1.5 text-base text-muted-foreground">Your site is live. Share the link:</DialogDescription>
            <div className="mt-5 flex h-11 items-center overflow-hidden rounded-md border border-input bg-background">
              <span className="min-w-0 flex-1 truncate px-3 font-mono text-sm">{url}</span>
              <button
                type="button"
                onClick={copy}
                className="flex h-full shrink-0 items-center gap-1.5 border-l border-input bg-card px-3.5 text-sm font-semibold hover:bg-accent"
              >
                <Copy className="size-4" aria-hidden="true" />
                <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <DialogClose className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-card px-4 text-sm font-semibold hover:bg-accent">
                Done
              </DialogClose>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <ExternalLink className="size-4" aria-hidden="true" />
                View site
              </a>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              You can change the address in{" "}
              <Link href={`/sites/${siteId}/settings`} className="font-medium text-foreground underline underline-offset-4">
                Settings
              </Link>
              .
            </p>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
