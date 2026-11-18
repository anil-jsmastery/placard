"use client";

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Puck, createUsePuck } from "@puckeditor/core";
import { Layers, Plus, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AddPanel, SectionAddedContext } from "./add-panel";
import { AiPanel, BuildStatusPill } from "./ai-panel";
import { useEditor } from "./editor";
import { FieldsPanel } from "./fields-panel";
import { LayersPanel } from "./layers-panel";
import { CanvasScaleContext } from "./section-overlay";
import { TopBar } from "./top-bar";

const usePuck = createUsePuck();

type Panel = "ai" | "add" | "layers" | "edit";

const PANEL_TITLES: Record<Panel, string> = { ai: "AI", add: "Add", layers: "Layers", edit: "Edit" };

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => true,
  );
}

/** <Puck.Preview /> at the viewport's width, scaled down to fit the canvas column (like SiteFrame). */
function Canvas() {
  const viewport = usePuck((s) => s.appState.ui.viewports.current.width);
  const width = typeof viewport === "number" ? viewport : 1280;
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const scale = box.w ? Math.min(1, box.w / width) : 1;

  return (
    <main className="flex min-w-0 flex-col overflow-hidden bg-canvas p-4 sm:p-6" aria-label="Page preview">
      <BuildStatusPill />
      <div ref={boxRef} className="min-h-0 min-w-0 flex-1">
        <div
          className="mx-auto overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5"
          style={{ width: width * scale, height: box.h, visibility: box.w ? undefined : "hidden" }}
        >
          <div style={{ width, height: box.h / scale, transform: `scale(${scale})`, transformOrigin: "top left" }}>
            <CanvasScaleContext.Provider value={scale}>
              <Puck.Preview />
            </CanvasScaleContext.Provider>
          </div>
        </div>
      </div>
    </main>
  );
}

const tabClass =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-md aria-selected:bg-card aria-selected:shadow-sm aria-[selected=false]:text-muted-foreground";

export function EditorLayout() {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [tab, setTab] = useState<"ai" | "add" | "layers">("ai");
  const { building } = useEditor();
  const [sheet, setSheet] = useState<Panel | null>(null);
  const hasSelection = usePuck((s) => !!s.selectedItem);
  const dispatch = usePuck((s) => s.dispatch);

  // Below 768 px the editor starts in the phone preview.
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) {
      dispatch({
        type: "setUi",
        ui: (ui) => ({ viewports: { ...ui.viewports, current: { width: 390, height: "auto" } } }),
        recordHistory: false,
      });
    }
  }, [dispatch]);

  const openSheet = sheet === "edit" && !hasSelection ? null : sheet;

  return (
    <SectionAddedContext.Provider value={() => setSheet(null)}>
      <div className="flex h-screen flex-col">
        <TopBar />
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_280px] xl:grid-cols-[340px_minmax(0,1fr)_320px]">
          <aside
            className="hidden min-h-0 flex-col border-r border-border bg-card lg:flex"
            aria-label={PANEL_TITLES[tab]}
          >
            <div className="border-b border-border p-3">
              <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-sm font-medium" role="tablist" aria-label="Editor panels">
                {(
                  [
                    { id: "ai", Icon: Sparkles },
                    { id: "add", Icon: Plus },
                    { id: "layers", Icon: Layers },
                  ] as const
                ).map(({ id, Icon }) => (
                  <button key={id} type="button" role="tab" aria-selected={tab === id} className={tabClass} onClick={() => setTab(id)}>
                    <Icon className="size-4" aria-hidden="true" />
                    {PANEL_TITLES[id]}
                  </button>
                ))}
              </div>
            </div>
            {isDesktop &&
              (tab === "ai" ? (
                <div className="min-h-0 flex-1">
                  <AiPanel />
                </div>
              ) : (
                <div className={cn("flex-1 overflow-y-auto p-4", building && "opacity-50")} inert={building}>
                  {tab === "add" ? <AddPanel /> : <LayersPanel />}
                </div>
              ))}
          </aside>

          <Canvas />

          <aside className="hidden min-h-0 overflow-y-auto border-l border-border bg-card lg:block" aria-label={hasSelection ? "Section fields" : "Site settings"}>
            {isDesktop && <FieldsPanel />}
          </aside>
        </div>

        {/* Below lg: panels open as bottom sheets from this bar */}
        <nav className="grid grid-cols-4 border-t border-border bg-card lg:hidden" aria-label="Editor panels">
          {(
            [
              { panel: "ai", Icon: Sparkles },
              { panel: "add", Icon: Plus },
              { panel: "layers", Icon: Layers },
              { panel: "edit", Icon: SlidersHorizontal },
            ] as const
          ).map(({ panel, Icon }) => (
            <button
              key={panel}
              type="button"
              disabled={panel === "edit" && !hasSelection}
              onClick={() => setSheet(panel)}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium disabled:pointer-events-none disabled:opacity-40",
                (openSheet ?? "ai") !== panel && "text-muted-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {PANEL_TITLES[panel]}
            </button>
          ))}
        </nav>

        {!isDesktop && (
          <Sheet open={openSheet !== null} onOpenChange={(open) => !open && setSheet(null)}>
            <SheetContent side="bottom" showCloseButton={false} className="h-[80vh] gap-0 bg-card" aria-describedby={undefined}>
              <SheetHeader className="flex-row items-center justify-between border-b border-border py-2 pr-2">
                <SheetTitle className="text-sm font-semibold">{openSheet ? PANEL_TITLES[openSheet] : ""}</SheetTitle>
                <SheetClose
                  className="grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground sm:size-8"
                  aria-label="Close"
                >
                  <X className="size-4" aria-hidden="true" />
                </SheetClose>
              </SheetHeader>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {openSheet === "ai" && <AiPanel />}
                {openSheet === "add" && (
                  <div className={cn("p-4", building && "opacity-50")} inert={building}>
                    <AddPanel />
                  </div>
                )}
                {openSheet === "layers" && (
                  <div className={cn("p-4", building && "opacity-50")} inert={building}>
                    <LayersPanel />
                  </div>
                )}
                {openSheet === "edit" && <FieldsPanel showHeader={false} />}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </SectionAddedContext.Provider>
  );
}
