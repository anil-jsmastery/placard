"use client";

import { ChevronDown, ChevronUp, Copy, Trash2 } from "lucide-react";
import { CATALOG } from "@/lib/sections/catalog";
import type { SectionType } from "@/lib/sections/schemas";
import { ROOT_ZONE, usePuck } from "./puck";

// overrides.actionBar: the prototype's .sec-bar on the selected section.
export function ActionBar() {
  const selector = usePuck((s) => s.appState.ui.itemSelector);
  const type = usePuck((s) => s.selectedItem?.type as SectionType | undefined);
  const count = usePuck((s) => s.appState.data.content.length);
  const dispatch = usePuck((s) => s.dispatch);
  if (!selector || !type) return <></>;
  const i = selector.index;
  const name = CATALOG[type].label;

  const move = (d: number) => {
    const j = i + d;
    if (j < 0 || j >= count) return;
    dispatch({ type: "reorder", sourceIndex: i, destinationIndex: j, destinationZone: ROOT_ZONE, recordHistory: false });
    dispatch({ type: "setUi", ui: { itemSelector: { index: j, zone: ROOT_ZONE } }, recordHistory: true });
  };
  const duplicate = () => dispatch({ type: "duplicate", sourceIndex: i, sourceZone: ROOT_ZONE });
  // The "{Section} removed" toast comes from the editor's onAction, so Puck's own Delete key gets it too.
  const remove = () => {
    dispatch({ type: "remove", index: i, zone: ROOT_ZONE, recordHistory: false });
    dispatch({ type: "setUi", ui: { itemSelector: null }, recordHistory: true });
  };

  return (
    <div className="sec-bar" role="toolbar" aria-label={`${name} actions`}>
      <span className="nm">{name}</span>
      <span className="vr" />
      <button type="button" aria-label="Move up" title="Move up" disabled={i === 0} onClick={() => move(-1)}><ChevronUp /></button>
      <button type="button" aria-label="Move down" title="Move down" disabled={i === count - 1} onClick={() => move(1)}><ChevronDown /></button>
      <button type="button" aria-label="Duplicate" title="Duplicate" onClick={duplicate}><Copy /></button>
      <button type="button" aria-label="Delete" title="Delete" onClick={remove}><Trash2 /></button>
    </div>
  );
}

// overrides.componentOverlay: the prototype's outlines, dashed on hover and solid blue when selected (app/puck.css).
export function ComponentOverlay({ hover, isSelected }: { hover: boolean; isSelected: boolean }) {
  return <div className={isSelected ? "ed-ov sel" : hover ? "ed-ov hover" : "ed-ov"} />;
}
