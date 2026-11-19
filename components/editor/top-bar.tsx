"use client";

import { useState } from "react";
import Link from "next/link";
import { createUsePuck, useGetPuck } from "@puckeditor/core";
import { toast } from "sonner";
import { ArrowLeft, Check, Monitor, Redo2, Smartphone, Tablet, Undo2 } from "lucide-react";
import { StatusBadge } from "@/components/app/status-badge";
import { cn } from "@/lib/utils";
import { publishSite } from "@/app/(main)/sites/[id]/edit/actions";
import { useEditor } from "./editor";
import { PublishDialog } from "./publish-dialog";

const usePuck = createUsePuck();

const DEVICES = [
  { width: 1280, label: "Desktop", Icon: Monitor },
  { width: 768, label: "Tablet", Icon: Tablet },
  { width: 390, label: "Phone", Icon: Smartphone },
] as const;

const iconButton =
  "grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40 sm:size-9";

function SaveStatusText() {
  const { status } = useEditor();
  if (status.state === "invalid") {
    return (
      <span className="hidden min-w-0 items-center gap-1 truncate text-xs text-destructive lg:inline-flex" role="status">
        Can&apos;t save: {status.message}
      </span>
    );
  }
  return (
    <span className="hidden items-center gap-1 text-xs text-muted-foreground lg:inline-flex" role="status">
      {status.state === "saved" && <Check className="size-3.5" aria-hidden="true" />}
      {status.state === "saved" ? "Saved" : status.state === "saving" ? "Saving…" : "Couldn't save. Retrying…"}
    </span>
  );
}

/** Publish: flushes autosave, then publishes. First publish → the dialog; later ones → a toast. */
function PublishButton() {
  const { site, status, building, flushSave, setLive } = useEditor();
  const getPuck = useGetPuck();
  const [publishing, setPublishing] = useState(false);
  const [dialogUrl, setDialogUrl] = useState<string | null>(null);

  const publish = async () => {
    setPublishing(true);
    try {
      if (!(await flushSave(getPuck().appState.data))) return;
      const result = await publishSite(site.id);
      if (!result.ok) {
        toast(`Can't publish: ${result.message}`);
        return;
      }
      setLive(true);
      if (result.firstPublish) {
        setDialogUrl(result.url);
      } else {
        toast("Published. Your changes are live.", {
          action: { label: "View site", onClick: () => window.open(result.url, "_blank", "noreferrer") },
        });
      }
    } catch {
      toast("That didn't work. Try again.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={building || publishing || status.state !== "saved"}
        onClick={publish}
        className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40 sm:h-9"
      >
        Publish
      </button>
      <PublishDialog
        open={dialogUrl !== null}
        onOpenChange={(open) => !open && setDialogUrl(null)}
        url={dialogUrl ?? ""}
        siteId={site.id}
      />
    </>
  );
}

/** Editor top bar (editor-topbar in the reference). */
export function TopBar() {
  const { site, live } = useEditor();
  const title = usePuck((s) => (s.appState.data.root.props as { title?: string } | undefined)?.title);
  const viewportWidth = usePuck((s) => s.appState.ui.viewports.current.width);
  const hasPast = usePuck((s) => s.history.hasPast);
  const hasFuture = usePuck((s) => s.history.hasFuture);
  const back = usePuck((s) => s.history.back);
  const forward = usePuck((s) => s.history.forward);
  const dispatch = usePuck((s) => s.dispatch);

  const setViewport = (width: number) =>
    dispatch({
      type: "setUi",
      ui: (ui) => ({ viewports: { ...ui.viewports, current: { width, height: "auto" } } }),
      recordHistory: false,
    });

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-3">
      <Link
        href="/dashboard"
        className="grid size-10 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:size-9"
        aria-label="Back to sites"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
      </Link>
      <div className="hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="truncate text-sm font-semibold">{title || site.name}</span>
        <span className="hidden shrink-0 sm:inline-flex">
          <StatusBadge status={live ? "live" : "draft"} />
        </span>
        <SaveStatusText />
      </div>
      <div className="mx-auto hidden items-center rounded-lg bg-muted p-0.5 md:flex" role="group" aria-label="Preview size">
        {DEVICES.map(({ width, label, Icon }) => {
          const active = viewportWidth === width;
          return (
            <button
              key={width}
              type="button"
              aria-pressed={active}
              aria-label={label}
              onClick={() => setViewport(width)}
              className={cn(
                "grid h-8 w-9 place-items-center rounded-md",
                active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
            </button>
          );
        })}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0">
        <button type="button" className={iconButton} aria-label="Undo" disabled={!hasPast} onClick={() => back()}>
          <Undo2 className="size-4" aria-hidden="true" />
        </button>
        <button type="button" className={iconButton} aria-label="Redo" disabled={!hasFuture} onClick={() => forward()}>
          <Redo2 className="size-4" aria-hidden="true" />
        </button>
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />
        <PublishButton />
      </div>
    </header>
  );
}
