"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import Image from "next/image";
import { Check, Upload, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { SealedLiveQuery } from "@neon/realtime/client";
import { Dialog, DialogClose, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LiveRows } from "@/components/realtime/live-rows";
import { IMAGE_TAGS, getImageTag, listImages, type ImageTag } from "@/lib/images/library";
import { APP_NAME } from "@/lib/config";
import { formatBytes } from "@/lib/plans";
import { cn } from "@/lib/utils";

/** What the picker hands back: a library photo (with its alt text) or an upload (no alt text of its own). */
export type PickedImage = { src: string; alt: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The image the field holds now (selected when the dialog opens). */
  currentSrc?: string;
  onPick: (image: PickedImage) => void;
};

type Tab = "library" | "upload";

const TAG_LABELS: Record<ImageTag, string> = {
  food: "Food",
  office: "Office",
  nature: "Nature",
  people: "People",
  product: "Product",
  abstract: "Abstract",
};

const isUpload = (src?: string) => !!src?.startsWith("/uploads/");

/** "Choose an image" dialog: the Library tab (image-picker.html) and the Upload tab (image-picker-upload.html). */
export function ImagePicker({ open, onOpenChange, currentSrc, onPick }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <PickerContent currentSrc={currentSrc} onPick={onPick} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function PickerContent({ currentSrc, onPick, onClose }: { currentSrc?: string; onPick: Props["onPick"]; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>(() => (isUpload(currentSrc) ? "upload" : "library"));
  const [tag, setTag] = useState<ImageTag | "all">(() => (currentSrc && getImageTag(currentSrc)) || "all");
  const [selected, setSelected] = useState<string | undefined>(currentSrc);
  const images = listImages(tag === "all" ? undefined : tag);
  // Only an image the open tab shows can be used (switching tags can hide the selected one).
  const libraryImage = selected ? images.find((i) => i.src === selected) : undefined;
  const chosen: PickedImage | undefined =
    tab === "library" ? libraryImage : isUpload(selected) ? { src: selected!, alt: "" } : undefined;

  return (
    <DialogPortal>
      <DialogOverlay className="z-40 bg-black/45 supports-backdrop-filter:backdrop-blur-none" />
      <DialogPrimitive.Content className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card shadow-xl outline-none">
      <DialogClose
        className="absolute top-2 right-2 grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:top-3 sm:right-3 sm:size-8"
        aria-label="Close"
      >
        <X className="size-4" aria-hidden="true" />
      </DialogClose>
      <div className="p-6 pb-0">
        <DialogTitle className="font-display text-xl font-bold">Choose an image</DialogTitle>
        <DialogDescription className="sr-only">Pick a photo from the library or upload your own.</DialogDescription>
        <div className="mt-4 flex gap-5 border-b border-border text-sm font-medium" role="tablist">
          {(["library", "upload"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "-mb-px flex h-10 items-center border-b-2",
                tab === t ? "border-primary" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "library" ? "Library" : "Upload"}
            </button>
          ))}
        </div>
      </div>
      {tab === "library" ? (
        <div className="p-6">
          <div className="flex flex-wrap gap-2">
            {(["all", ...IMAGE_TAGS] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={tag === t}
                onClick={() => setTag(t)}
                className={cn(
                  "h-9 rounded-full border px-3 text-sm sm:h-8",
                  tag === t ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-border hover:bg-accent",
                )}
              >
                {t === "all" ? "All" : TAG_LABELS[t]}
              </button>
            ))}
          </div>
          <div className="mt-4 grid max-h-[46vh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-4">
            {images.map((image) => (
              <ImageTile
                key={image.id}
                src={image.src}
                label={image.alt}
                selected={image.src === selected}
                onSelect={() => setSelected(image.src)}
                onUse={() => onPick(image)}
              />
            ))}
          </div>
        </div>
      ) : (
        <UploadTab selected={selected} onSelect={setSelected} onUse={(src) => onPick({ src, alt: "" })} />
      )}
      <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4 sm:justify-between">
        <p className="hidden text-sm text-muted-foreground sm:block">
          {tab === "library" ? `Free-to-use photos included with ${APP_NAME}` : "Uploads can be used on any of your sites"}
        </p>
        <div className="flex gap-2 whitespace-nowrap">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!chosen} onClick={() => chosen && onPick(chosen)}>
            Use image
          </Button>
        </div>
      </div>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function ImageTile({
  src,
  label,
  selected,
  onSelect,
  onUse,
}: {
  src: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onUse: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onSelect}
      onDoubleClick={onUse}
      className={cn(
        "group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted",
        selected ? "ring-[3px] ring-primary ring-offset-2" : "hover:opacity-90",
      )}
    >
      <Image src={src} alt="" fill sizes="(min-width: 640px) 180px, 45vw" className="object-cover" />
      {selected && (
        <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3.5" aria-hidden="true" />
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Upload tab (Step 12)

type UploadRow = {
  id: string;
  path: string;
  bytes: number;
  status: string;
  error: string | null;
  createdAt: string;
};
type UploadsData = { uploads: UploadRow[]; used: number; limit: number; sealed: SealedLiveQuery<UploadRow> | null };

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const WAIT_MS = 30_000;
const POLL_MS = 2_000;
const DIDNT_GO_THROUGH = "That upload didn't go through. Try again.";

/** idle → sending (the PUT, with progress) → waiting (for the function's `uploads` row) → idle */
type Phase = { kind: "idle" } | { kind: "sending"; progress: number } | { kind: "waiting"; id: string };

/** PUTs the file to the presigned URL, reporting progress (0–100). Resolves on a 2xx, rejects otherwise. */
function putFile(url: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
    xhr.onerror = () => reject(new Error("network"));
    xhr.send(file);
  });
}

function UploadTab({
  selected,
  onSelect,
  onUse,
}: {
  selected?: string;
  onSelect: (src: string) => void;
  onUse: (src: string) => void;
}) {
  const [data, setData] = useState<UploadsData | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/uploads", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as UploadsData;
  }, []);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (d) => !cancelled && setData(d),
      () => !cancelled && setData({ uploads: [], used: 0, limit: 0, sealed: null }),
    );
    return () => {
      cancelled = true;
    };
  }, [load]);

  // Re-reads the rows (without Realtime, while an upload is waiting). The sealed query stays the first one.
  const refresh = useCallback(async () => {
    try {
      const d = await load();
      setData((prev) => (prev ? { ...prev, uploads: d.uploads, used: d.used, limit: d.limit } : d));
    } catch {
      // the next tick tries again
    }
  }, [load]);

  // Nothing within 30 seconds after the file went up: the function never recorded it
  const waitingId = phase.kind === "waiting" ? phase.id : null;
  useEffect(() => {
    if (!waitingId) return;
    const timer = setTimeout(() => {
      setPhase({ kind: "idle" });
      setError(DIDNT_GO_THROUGH);
    }, WAIT_MS);
    return () => clearTimeout(timer);
  }, [waitingId]);

  const onRow = useCallback(
    (row: UploadRow) => {
      setPhase({ kind: "idle" });
      if (row.status === "ready") onSelect(row.path);
      else setError(row.error || DIDNT_GO_THROUGH);
    },
    [onSelect],
  );

  async function upload(file: File) {
    if (phase.kind !== "idle") return;
    setError(null);
    if (!TYPES.includes(file.type)) return setError("Use a JPG, PNG or WebP image.");
    if (file.size > MAX_BYTES) return setError("Images can be up to 5 MB.");

    setPhase({ kind: "sending", progress: 0 });
    try {
      const res = await fetch("/api/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: file.type, size: file.size }),
      });
      const body = (await res.json().catch(() => null)) as { id?: string; url?: string; error?: string } | null;
      if (!res.ok || !body?.id || !body.url) {
        setPhase({ kind: "idle" });
        setError(body?.error ?? DIDNT_GO_THROUGH);
        return;
      }
      await putFile(body.url, file, (progress) => setPhase({ kind: "sending", progress }));
      setPhase({ kind: "waiting", id: body.id });
    } catch {
      setPhase({ kind: "idle" });
      setError(DIDNT_GO_THROUGH);
    }
  }

  function pick(files: FileList | null) {
    const file = files?.[0];
    if (file) void upload(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files);
  }

  const busy = phase.kind !== "idle";

  return (
    <div className="p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn("rounded-xl border-2 border-dashed border-input p-8 text-center", dragging && "border-primary bg-accent")}
      >
        <Upload className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
        {busy ? (
          <div className="mx-auto mt-3 max-w-xs" aria-live="polite">
            <p className="text-sm">Uploading…</p>
            <Progress
              className="mt-3"
              value={phase.kind === "sending" ? phase.progress : 100}
              aria-label="Upload progress"
            />
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm">
              Drop an image here or{" "}
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="font-semibold underline underline-offset-4"
              >
                browse
              </button>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or WebP, up to 5 MB</p>
          </>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-2 text-sm text-destructive" role="alert">{error}</p>}
      {data && (
        <LiveRows name="uploads" params={{}} sealed={data.sealed} initialRows={data.uploads}>
          {(rows, live) => (
            <YourImages
              rows={rows}
              live={live}
              limit={data.limit}
              waitingId={waitingId}
              onRow={onRow}
              refresh={refresh}
              selected={selected}
              onSelect={onSelect}
              onUse={onUse}
            />
          )}
        </LiveRows>
      )}
    </div>
  );
}

function YourImages({
  rows,
  live,
  limit,
  waitingId,
  onRow,
  refresh,
  selected,
  onSelect,
  onUse,
}: {
  rows: readonly UploadRow[];
  live: boolean;
  limit: number;
  waitingId: string | null;
  onRow: (row: UploadRow) => void;
  refresh: () => Promise<void>;
  selected?: string;
  onSelect: (src: string) => void;
  onUse: (src: string) => void;
}) {
  // The waiting upload's row arrived (live, or from the next re-read)
  useEffect(() => {
    if (!waitingId) return;
    const row = rows.find((r) => r.id === waitingId);
    if (row) onRow(row);
  }, [rows, waitingId, onRow]);

  // Without Realtime, re-read every 2 seconds while an upload is waiting
  useEffect(() => {
    if (!waitingId || live) return;
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [waitingId, live, refresh]);

  const ready = rows.filter((r) => r.status === "ready");
  const used = ready.reduce((total, r) => total + r.bytes, 0);

  return (
    <>
      <div className="mt-6 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Your images</h3>
        {limit > 0 && (
          <p className="text-xs tabular-nums text-muted-foreground">
            {formatBytes(used)} of {formatBytes(limit)} used
          </p>
        )}
      </div>
      {ready.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-3 p-1 sm:grid-cols-4">
          {ready.map((row, i) => (
            <ImageTile
              key={row.id}
              src={row.path}
              label={`Your image ${ready.length - i}`}
              selected={row.path === selected}
              onSelect={() => onSelect(row.path)}
              onUse={() => onUse(row.path)}
            />
          ))}
        </div>
      )}
    </>
  );
}
