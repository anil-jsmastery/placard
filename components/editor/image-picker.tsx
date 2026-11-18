"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Dialog, DialogClose, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { IMAGE_TAGS, getImageTag, listImages, type ImageTag, type LibraryImage } from "@/lib/images/library";
import { APP_NAME } from "@/lib/config";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The image the field holds now (selected when the dialog opens). */
  currentSrc?: string;
  onPick: (image: LibraryImage) => void;
};

const TAG_LABELS: Record<ImageTag, string> = {
  food: "Food",
  office: "Office",
  nature: "Nature",
  people: "People",
  product: "Product",
  abstract: "Abstract",
};

/** "Choose an image" dialog (image-picker.html): the Library tab. The Upload tab arrives in Step 12. */
export function ImagePicker({ open, onOpenChange, currentSrc, onPick }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <PickerContent currentSrc={currentSrc} onPick={onPick} onClose={() => onOpenChange(false)} />}
    </Dialog>
  );
}

function PickerContent({ currentSrc, onPick, onClose }: { currentSrc?: string; onPick: Props["onPick"]; onClose: () => void }) {
  const [tag, setTag] = useState<ImageTag | "all">(() => (currentSrc && getImageTag(currentSrc)) || "all");
  const [selected, setSelected] = useState<string | undefined>(currentSrc);
  const images = listImages(tag === "all" ? undefined : tag);
  // Only a photo the grid shows can be used (switching tags can hide the selected one).
  const chosen = selected ? images.find((i) => i.src === selected) : undefined;

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
        <DialogDescription className="sr-only">Pick a photo from the library.</DialogDescription>
        <div className="mt-4 flex gap-5 border-b border-border text-sm font-medium" role="tablist">
          <button type="button" role="tab" aria-selected="true" className="-mb-px flex h-10 items-center border-b-2 border-primary">
            Library
          </button>
        </div>
      </div>
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
          {images.map((image) => {
            const isSelected = image.src === selected;
            return (
              <button
                key={image.id}
                type="button"
                aria-pressed={isSelected}
                aria-label={image.alt}
                onClick={() => setSelected(image.src)}
                onDoubleClick={() => onPick(image)}
                className={cn(
                  "group relative aspect-[4/3] overflow-hidden rounded-lg bg-muted",
                  isSelected ? "ring-[3px] ring-primary ring-offset-2" : "hover:opacity-90",
                )}
              >
                <Image src={image.src} alt="" fill sizes="(min-width: 640px) 180px, 45vw" className="object-cover" />
                {isSelected && (
                  <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" aria-hidden="true" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4 sm:justify-between">
        <p className="hidden text-sm text-muted-foreground sm:block">Free-to-use photos included with {APP_NAME}</p>
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
