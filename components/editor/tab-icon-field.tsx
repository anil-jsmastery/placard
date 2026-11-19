"use client";

import { useId, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { RootProps } from "@/lib/sections/schemas";
import { cn } from "@/lib/utils";

const EMOJI =
  "✨ ⭐ 🌟 🔥 💡 🎯 🚀 🌱 🌿 🌸 🌻 🍞 🥐 ☕ 🍰 🍕 🍜 🍷 🏠 🏡 🛠️ 🔧 🧰 💼 📷 🎨 🎵 🎤 📚 ✏️ 💻 📱 🧘 🏃 ⚽ 🐾 ❤️ 💬 📅 🎉".split(" ");

const MAX = RootProps.shape.favicon.def.innerType.maxLength ?? 8;

/** True for exactly one emoji (one grapheme with a pictograph), short enough for `root.props.favicon`. */
export function isSingleEmoji(value: string) {
  const text = value.trim();
  if (!text || text.length > MAX) return false;
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)];
  return graphemes.length === 1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u.test(text);
}

/** Site settings › Tab icon: the current emoji opens a menu of 40, plus "Or type one". */
export function TabIconField({ label, value, onChange, readOnly }: { label: string; value: string | undefined; onChange: (v: string) => void; readOnly?: boolean }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const current = value || "✨";

  const pick = (emoji: string) => {
    onChange(emoji);
    setTyped("");
    setOpen(false);
  };

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2">
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger
            id={id}
            disabled={readOnly}
            className="grid size-9 place-items-center rounded-md border border-input text-lg"
            aria-label={`Tab icon: ${current}. Change`}
          >
            {current}
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-auto p-1">
            <div className="grid grid-cols-8">
              {EMOJI.map((emoji) => (
                <DropdownMenuItem
                  key={emoji}
                  className={cn("size-9 justify-center p-0 text-lg", emoji === current && "bg-accent")}
                  aria-label={emoji}
                  onSelect={() => pick(emoji)}
                >
                  {emoji}
                </DropdownMenuItem>
              ))}
            </div>
            <div className="border-t border-border p-1 pt-2">
              <input
                value={typed}
                placeholder="Or type one"
                aria-label="Or type one"
                className="h-9 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm"
                // Keep the menu's type-ahead and arrow keys out of the input.
                onKeyDown={(e) => {
                  if (e.key !== "Escape") e.stopPropagation();
                }}
                onChange={(e) => {
                  const next = e.target.value;
                  if (isSingleEmoji(next)) pick(next.trim());
                  else setTyped(next);
                }}
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="text-xs text-muted-foreground">An emoji shown in the browser tab</span>
      </div>
    </div>
  );
}
