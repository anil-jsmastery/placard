"use client";

import { Puck, createUsePuck } from "@puckeditor/core";
import { Lock, Settings2, X } from "lucide-react";
import { SECTION_CATALOG } from "@/lib/sections/catalog";
import type { SectionType } from "@/lib/sections/schemas";
import { useEditor } from "./editor";

const usePuck = createUsePuck();

/** Right panel: the selected section's fields, or Site settings when nothing is selected. */
export function FieldsPanel({ showHeader = true }: { showHeader?: boolean }) {
  const selectedType = usePuck((s) => s.selectedItem?.type as SectionType | undefined);
  const dispatch = usePuck((s) => s.dispatch);
  const section = selectedType ? SECTION_CATALOG[selectedType] : undefined;
  const Icon = section?.icon ?? Settings2;
  const { building } = useEditor();

  // While the AI builds, fields are locked (editor-generating.html)
  if (building) {
    return (
      <>
        {showHeader && (
          <div className="flex h-12 items-center border-b border-border px-4">
            <h2 className="text-sm font-semibold">Fields</h2>
          </div>
        )}
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <Lock className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 max-w-[220px] text-sm text-muted-foreground">Sections become editable when the build finishes.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {showHeader && (
        <div className="flex h-12 items-center gap-2 border-b border-border px-4">
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-semibold">{section ? section.label : "Site settings"}</h2>
          {section && (
            <button
              type="button"
              className="ml-auto grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close and show site settings"
              onClick={() => dispatch({ type: "setUi", ui: { itemSelector: null }, recordHistory: false })}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      <div className="p-4" data-fields-panel>
        <Puck.Fields wrapFields={false} />
      </div>
    </>
  );
}
