"use client";

import { createUsePuck } from "@puckeditor/core";
import { GripVertical } from "lucide-react";
import { SECTION_CATALOG } from "@/lib/sections/catalog";
import type { SectionType } from "@/lib/sections/schemas";
import { cn } from "@/lib/utils";
import { useSortable } from "./sortable";

const usePuck = createUsePuck();

const ZONE = "root:default-zone";

/** A muted one-line summary: the section's heading, headline or first item. */
export function sectionSummary(props: Record<string, unknown>): string {
  for (const key of ["heading", "headline"]) {
    const v = props[key];
    if (typeof v === "string" && v.trim()) return v;
  }
  for (const list of ["items", "plans", "images", "socials"]) {
    const first = (props[list] as Record<string, unknown>[] | undefined)?.[0];
    if (!first) continue;
    for (const key of ["title", "name", "label", "question", "caption", "quote", "platform"]) {
      const v = first[key];
      if (typeof v === "string" && v.trim()) return v;
    }
  }
  return "";
}

/** Scrolls the canvas to a section. */
function scrollToSection(id: string) {
  const frame = document.getElementById("preview-frame") as HTMLIFrameElement | null;
  const el = frame?.contentDocument?.querySelector(`[data-puck-component="${CSS.escape(id)}"]`);
  el?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** The page's sections in order: icon, label and summary; click to select, drag the handle to reorder. */
export function LayersPanel() {
  const content = usePuck((s) => s.appState.data.content);
  const selectedIndex = usePuck((s) => (s.appState.ui.itemSelector?.zone ?? ZONE) === ZONE ? s.appState.ui.itemSelector?.index : undefined);
  const dispatch = usePuck((s) => s.dispatch);

  const select = (index: number) => {
    dispatch({ type: "setUi", ui: { itemSelector: { index, zone: ZONE } }, recordHistory: false });
    scrollToSection(String(content[index]?.props.id));
  };

  const sortable = useSortable(content.length, (from, to) => {
    dispatch({ type: "reorder", sourceIndex: from, destinationIndex: to, destinationZone: ZONE });
    if (selectedIndex === from) dispatch({ type: "setUi", ui: { itemSelector: { index: to, zone: ZONE } }, recordHistory: false });
  }, content);

  return (
    <ol className="space-y-1" aria-label="Sections">
      {content.map((item, index) => {
        const entry = SECTION_CATALOG[item.type as SectionType];
        const Icon = entry?.icon;
        const summary = sectionSummary(item.props as Record<string, unknown>);
        const drop = sortable.dropAt(index);
        return (
          <li
            key={String(item.props.id)}
            ref={sortable.rowRef(index)}
            className={cn(
              "relative flex items-center rounded-md hover:bg-accent",
              selectedIndex === index && "bg-accent",
              sortable.dragging === index && "opacity-50",
            )}
          >
            {drop && (
              <span
                className={cn("absolute inset-x-0 h-0.5 rounded-full bg-primary", drop === "before" ? "-top-0.75" : "-bottom-0.75")}
                aria-hidden="true"
              />
            )}
            <button
              type="button"
              onClick={() => select(index)}
              aria-current={selectedIndex === index || undefined}
              className="flex h-12 min-w-0 flex-1 items-center gap-2.5 pl-2.5 text-left"
            >
              {Icon && <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{entry?.label ?? item.type}</span>
                {summary && <span className="block truncate text-xs text-muted-foreground">{summary}</span>}
              </span>
            </button>
            <button
              type="button"
              className="grid h-12 w-10 shrink-0 cursor-grab place-items-center text-muted-foreground active:cursor-grabbing disabled:cursor-default"
              aria-label={`Move ${entry?.label ?? item.type}`}
              disabled={content.length < 2}
              {...sortable.handleProps(index)}
            >
              <GripVertical className="size-4 shrink-0" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
