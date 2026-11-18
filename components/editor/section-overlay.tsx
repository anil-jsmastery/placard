"use client";

import { createContext, useContext } from "react";
import { createUsePuck } from "@puckeditor/core";
import { ArrowDown, ArrowUp, Copy, Trash2 } from "lucide-react";

const usePuck = createUsePuck();

/** How much the canvas is scaled down to fit (1 = actual size). Overlays undo it to stay at screen size. */
export const CanvasScaleContext = createContext(1);

/** overrides.componentOverlay: a 2 px `primary` outline on hover and selection, at screen size. */
export function SectionOverlay({ hover, isSelected }: { children: React.ReactNode; hover: boolean; isSelected: boolean }) {
  const scale = useContext(CanvasScaleContext);
  if (!hover && !isSelected) return <></>;
  return (
    <div
      className="pointer-events-none h-full w-full"
      style={{ outline: `${2 / scale}px solid var(--primary)`, outlineOffset: `${-2 / scale}px` }}
    />
  );
}

const actionClass = "grid size-9 place-items-center rounded-md hover:bg-white/15 disabled:pointer-events-none disabled:opacity-40 sm:size-7";

/** overrides.actionBar: section name, Move up, Move down, Duplicate, Delete, top-left inside the selected section. */
export function SectionActionBar({ label }: { label?: string; children: React.ReactNode }) {
  const scale = useContext(CanvasScaleContext);
  const selector = usePuck((s) => s.appState.ui.itemSelector);
  const count = usePuck((s) => s.appState.data.content.length);
  const dispatch = usePuck((s) => s.dispatch);
  if (!selector) return <></>;
  const { index } = selector;
  const zone = selector.zone ?? "root:default-zone";

  const move = (to: number) => {
    dispatch({ type: "reorder", sourceIndex: index, destinationIndex: to, destinationZone: zone });
    dispatch({ type: "setUi", ui: { itemSelector: { index: to, zone } }, recordHistory: false });
  };

  return (
    <div style={{ transform: `scale(${1 / scale})`, transformOrigin: "top left" }}>
      <div
        className="m-2 flex items-center gap-0.5 rounded-lg bg-primary p-1 font-sans text-xs text-primary-foreground shadow-lg"
        role="toolbar"
        aria-label="Section actions"
      >
        <span className="px-2 font-semibold">{label}</span>
        <button type="button" className={actionClass} aria-label="Move up" disabled={index === 0} onClick={() => move(index - 1)}>
          <ArrowUp className="size-3.5" aria-hidden="true" />
        </button>
        <button type="button" className={actionClass} aria-label="Move down" disabled={index >= count - 1} onClick={() => move(index + 1)}>
          <ArrowDown className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={actionClass}
          aria-label="Duplicate"
          onClick={() => {
            dispatch({ type: "duplicate", sourceIndex: index, sourceZone: zone });
            dispatch({ type: "setUi", ui: { itemSelector: { index: index + 1, zone } }, recordHistory: false });
          }}
        >
          <Copy className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          className={actionClass}
          aria-label="Delete"
          onClick={() => {
            dispatch({ type: "remove", index, zone });
            dispatch({ type: "setUi", ui: { itemSelector: null }, recordHistory: false });
          }}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
