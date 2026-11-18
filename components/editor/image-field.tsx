"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ImagePicker } from "./image-picker";

export type ImageValue = { src: string; alt: string };

type Props = {
  label: string;
  value: ImageValue | undefined;
  onChange: (value: ImageValue | undefined) => void;
  /** The section can do without an image: show "Remove". */
  optional: boolean;
  readOnly?: boolean;
};

/** Custom Puck field for `Image`: thumbnail, alt text, Change (opens the picker) and Remove. `src` is never typed by hand. */
export function ImageField({ label, value, onChange, optional, readOnly }: Props) {
  const [open, setOpen] = useState(false);
  const altId = useId();

  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <div className="mt-2 space-y-3">
        {value?.src ? (
          <div className="relative aspect-[16/10] overflow-hidden rounded-md border border-border bg-muted">
            <Image src={value.src} alt="" fill sizes="320px" className="object-cover" />
          </div>
        ) : (
          <div className="grid aspect-[16/10] place-items-center rounded-md border border-dashed border-input text-sm text-muted-foreground">
            No image
          </div>
        )}
        {value?.src && (
          <div>
            <label htmlFor={altId} className="text-xs font-medium text-muted-foreground">
              Description for screen readers
            </label>
            <input
              id={altId}
              value={value.alt}
              maxLength={200}
              readOnly={readOnly}
              onChange={(e) => onChange({ ...value, alt: e.target.value })}
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm"
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="h-10 sm:h-8" disabled={readOnly} onClick={() => setOpen(true)}>
            Change
          </Button>
          {optional && value?.src && (
            <Button type="button" variant="ghost" size="sm" className="h-10 sm:h-8" disabled={readOnly} onClick={() => onChange(undefined)}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <ImagePicker
        open={open}
        onOpenChange={setOpen}
        currentSrc={value?.src}
        onPick={(image) => {
          onChange({ src: image.src, alt: value?.alt?.trim() ? value.alt : image.alt });
          setOpen(false);
        }}
      />
    </div>
  );
}
