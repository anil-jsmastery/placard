"use client";

import { createContext, useContext } from "react";
import { Puck, createUsePuck } from "@puckeditor/core";
import { SECTION_LIST } from "@/lib/sections/puck-config";

const usePuck = createUsePuck();
const ROOT_ZONE = "root:default-zone";

/** Called after a tile click adds a section (the phone layout closes its sheet). */
export const SectionAddedContext = createContext<() => void>(() => {});

/** overrides.drawerItem: one tile of the 2-column grid. Drag it onto the page, or click to add it at the end. */
export function AddTile({ name }: { children: React.ReactNode; name: string }) {
  const dispatch = usePuck((s) => s.dispatch);
  const count = usePuck((s) => s.appState.data.content.length);
  const onAdded = useContext(SectionAddedContext);
  const section = SECTION_LIST.find((s) => s.type === name || s.label === name);
  if (!section) return <></>;
  const Icon = section.icon;

  const add = () => {
    dispatch({ type: "insert", componentType: section.type, destinationIndex: count, destinationZone: ROOT_ZONE });
    dispatch({ type: "setUi", ui: { itemSelector: { index: count, zone: ROOT_ZONE } }, recordHistory: false });
    onAdded();
  };

  // A div, not a <button>: Puck's drag engine won't start a drag from inside a native button.
  return (
    <div
      role="button"
      tabIndex={0}
      className="flex w-full cursor-pointer flex-col items-start gap-3 rounded-lg border border-border bg-card p-3 text-left outline-none hover:border-input hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/30"
      onClick={add}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (!e.repeat) add();
        }
      }}
    >
      <Icon className="size-5" aria-hidden="true" />
      <span className="text-sm font-medium">{section.label}</span>
    </div>
  );
}

/** The section library: `<Puck.Components />` restyled as the tile grid (puck-theme.css). */
export function AddPanel() {
  return (
    <div data-add-panel>
      <p className="text-sm text-muted-foreground">Drag a section onto the page, or click to add it at the end.</p>
      <div className="mt-4">
        <Puck.Components />
      </div>
    </div>
  );
}
