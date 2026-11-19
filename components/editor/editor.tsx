"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Puck, type Data, type Overrides } from "@puckeditor/core";
import "@puckeditor/core/puck.css";
import "./puck-theme.css";
import { siteFontVars } from "@/app/fonts";
import { track } from "@/lib/analytics/client";
import { SECTION_CATALOG } from "@/lib/sections/catalog";
import { ROOT_FIELD_LABELS, fieldLabel, puckConfig } from "@/lib/sections/puck-config";
import type { SectionType } from "@/lib/sections/schemas";
import type { PageData } from "@/lib/site/types";
import { saveDraft } from "@/app/(main)/sites/[id]/edit/actions";
import type { UseCase } from "@/lib/analytics/events";
import { AiRunProvider } from "./ai-panel";
import { EditorLayout } from "./editor-layout";
import { AddTile } from "./add-panel";
import { SectionActionBar, SectionOverlay } from "./section-overlay";
import { fieldTypeOverrides } from "./fields";
import { EditorShortcuts, listenForShortcuts } from "./shortcuts";

export type EditorSite = { id: string; name: string; slug: string; draft: PageData; publishedAt: Date | null };

/** The usage line under the AI composer. */
export type AiUsage = { left: number; total: number };

export type SaveStatus =
  | { state: "saved" }
  | { state: "saving" }
  | { state: "retrying" }
  | { state: "invalid"; message: string };

type EditorContextValue = {
  site: EditorSite;
  status: SaveStatus;
  /** An AI run is building the page: autosave is paused and hand editing is locked. */
  building: boolean;
  setBuilding: (building: boolean) => void;
  /** The server already saved this page (the end of an AI run): don't autosave it again. */
  markSaved: (data: Data) => void;
  usage: AiUsage;
  setUsage: (usage: AiUsage) => void;
  /** Saves this page now (waiting for a save in flight), so the server's draft is the page the user sees. False when it couldn't be saved. */
  flushSave: (data: Data) => Promise<boolean>;
  /** Called on the first hand edit after it's set (the AI panel uses it to hide "Undo AI change"). */
  handEditRef: React.RefObject<(() => void) | null>;
};

const EditorContext = createContext<EditorContextValue | null>(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditor must be used inside <Editor>");
  return ctx;
}

const VIEWPORTS = [
  { width: 390, label: "Phone", icon: "Smartphone" as const },
  { width: 768, label: "Tablet", icon: "Tablet" as const },
  { width: 1280, label: "Desktop", icon: "Monitor" as const },
];

/** The canvas starts at desktop width (below 768 px the layout switches to phone). */
const INITIAL_UI = { viewports: { current: { width: 1280, height: "auto" as const }, controlsVisible: true, options: [] } };

/** "Hero › Link" or "Site settings › Site title" for a validation error's path. */
function describePath(path: (string | number)[], data: Data): string {
  if (path[0] === "root") {
    const key = String(path[2] ?? "");
    const label = ROOT_FIELD_LABELS[key as keyof typeof ROOT_FIELD_LABELS] ?? fieldLabel(key);
    return `Site settings › ${label}`;
  }
  const section = typeof path[1] === "number" ? data.content[path[1]] : undefined;
  const sectionLabel = section ? (SECTION_CATALOG[section.type as SectionType]?.label ?? section.type) : "Page";
  const keys = path.slice(3).filter((p): p is string => typeof p === "string");
  return keys.length ? `${sectionLabel} › ${fieldLabel(keys[keys.length - 1])}` : sectionLabel;
}

/** Debounced autosave (1000 ms). Invalid pages aren't stored; network errors retry after 3 s. Paused during AI runs. */
function useAutosave(
  siteId: string,
  initial: PageData,
  paused: React.RefObject<boolean>,
  handEditRef: React.RefObject<(() => void) | null>,
) {
  const [status, setStatus] = useState<SaveStatus>({ state: "saved" });
  const initialJson = useMemo(() => JSON.stringify(initial), [initial]);
  const lastSaved = useRef(initialJson);
  const latest = useRef<Data | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const inFlightSave = useRef<Promise<unknown> | null>(null);
  const edited = useRef(false);
  const mounted = useRef(true);

  const runRef = useRef<() => void>(() => {});
  const schedule = useCallback((ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => runRef.current(), ms);
  }, []);

  const run = useCallback(async () => {
    timer.current = null;
    // A save queued before an AI run started waits for the run: markSaved discards it, a failed run lets it through.
    if (paused.current) {
      schedule(1000);
      return;
    }
    const data = latest.current;
    if (!data || inFlight.current) return;
    const json = JSON.stringify(data);
    if (json === lastSaved.current) {
      setStatus({ state: "saved" });
      return;
    }
    inFlight.current = true;
    setStatus({ state: "saving" });
    try {
      const request = saveDraft(siteId, data);
      inFlightSave.current = request;
      const result = await request;
      inFlight.current = false;
      if (!mounted.current) return;
      const changedSince = !!latest.current && JSON.stringify(latest.current) !== json;
      if (result.ok) {
        lastSaved.current = json;
        // Still "Saving…" when the page changed while this request ran.
        setStatus({ state: changedSince ? "saving" : "saved" });
      } else {
        setStatus({ state: "invalid", message: `${result.message} (${describePath(result.path, data)})` });
      }
      // The page changed while this save was running: save the newer version.
      if (changedSince && !timer.current) schedule(0);
    } catch {
      inFlight.current = false;
      // The write may or may not have landed: don't trust lastSaved until a save succeeds.
      lastSaved.current = "";
      if (!mounted.current) return;
      setStatus({ state: "retrying" });
      schedule(3000);
    }
  }, [siteId, schedule, paused]);

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const onChange = useCallback(
    (data: Data) => {
      // An AI run changes the page; the server saves it when the run ends.
      if (paused.current) return;
      const json = JSON.stringify(data);
      // Puck reports the page once when it loads; nothing changed.
      if (json === lastSaved.current && !latest.current) return;
      latest.current = data;
      handEditRef.current?.();
      if (!edited.current && json !== initialJson) {
        edited.current = true;
        track("site_edited", { site_id: siteId });
      }
      setStatus((s) => (s.state === "invalid" || s.state === "retrying" ? s : { state: "saving" }));
      schedule(1000);
    },
    [initialJson, schedule, siteId, paused, handEditRef],
  );

  const flush = useCallback(
    async (data: Data) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      while (inFlight.current && inFlightSave.current) await inFlightSave.current.catch(() => {});
      const json = JSON.stringify(data);
      if (json === lastSaved.current) return true;
      try {
        const result = await saveDraft(siteId, data);
        if (!result.ok) {
          setStatus({ state: "invalid", message: `${result.message} (${describePath(result.path, data)})` });
          return false;
        }
        lastSaved.current = json;
        latest.current = null;
        setStatus({ state: "saved" });
        return true;
      } catch {
        // The write may or may not have landed: keep the page and retry like autosave does
        lastSaved.current = "";
        latest.current = data;
        if (mounted.current) setStatus({ state: "retrying" });
        schedule(3000);
        return false;
      }
    },
    [siteId, schedule],
  );

  const markSaved = useCallback((data: Data) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    lastSaved.current = JSON.stringify(data);
    latest.current = null;
    setStatus({ state: "saved" });
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { status, onChange, markSaved, flush };
}

/** The iframe gets the site fonts' CSS variables (globals.css is copied in by Puck). */
function IframeFonts({ children, document: doc }: { children: React.ReactNode; document?: Document }) {
  useEffect(() => {
    if (!doc) return;
    const classes = siteFontVars.split(" ");
    doc.body.classList.add(...classes);
    const stopShortcuts = listenForShortcuts(doc);
    return () => {
      doc.body.classList.remove(...classes);
      stopShortcuts();
    };
  }, [doc]);
  return <>{children}</>;
}

const overrides: Partial<Overrides> = {
  iframe: IframeFonts,
  componentOverlay: SectionOverlay,
  actionBar: SectionActionBar,
  drawerItem: AddTile,
  fieldTypes: fieldTypeOverrides,
};

/** Leaving while a save is pending or the page can't be saved asks first. */
function useLeaveWarning(status: SaveStatus) {
  const unsaved = status.state !== "saved";
  useEffect(() => {
    if (!unsaved) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [unsaved]);
}

export function Editor({ site, usage: initialUsage, useCase }: { site: EditorSite; usage: AiUsage; useCase: UseCase }) {
  const paused = useRef(false);
  const [building, setBuildingState] = useState(false);
  const [usage, setUsage] = useState(initialUsage);
  const handEditRef = useRef<(() => void) | null>(null);
  const { status, onChange, markSaved, flush: flushSave } = useAutosave(site.id, site.draft, paused, handEditRef);
  useLeaveWarning(status);
  const setBuilding = useCallback((value: boolean) => {
    paused.current = value;
    setBuildingState(value);
  }, []);
  const value = useMemo(
    () => ({ site, status, building, setBuilding, markSaved, usage, setUsage, flushSave, handEditRef }),
    [site, status, building, setBuilding, markSaved, usage, flushSave],
  );
  return (
    <EditorContext.Provider value={value}>
      <Puck
        config={puckConfig}
        data={site.draft as Data}
        onChange={onChange}
        overrides={overrides}
        viewports={VIEWPORTS}
        iframe={{ enabled: true }}
        ui={INITIAL_UI}
        height="100%"
      >
        <AiRunProvider useCase={useCase}>
          <EditorShortcuts />
          <EditorLayout />
        </AiRunProvider>
      </Puck>
    </EditorContext.Provider>
  );
}
