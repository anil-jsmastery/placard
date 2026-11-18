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
import { EditorLayout } from "./editor-layout";
import { AddTile } from "./add-panel";
import { SectionActionBar, SectionOverlay } from "./section-overlay";

export type EditorSite = { id: string; name: string; slug: string; draft: PageData; publishedAt: Date | null };

export type SaveStatus =
  | { state: "saved" }
  | { state: "saving" }
  | { state: "retrying" }
  | { state: "invalid"; message: string };

const EditorContext = createContext<{ site: EditorSite; status: SaveStatus } | null>(null);

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

/** Debounced autosave (1000 ms). Invalid pages aren't stored; network errors retry after 3 s. */
function useAutosave(siteId: string, initial: PageData) {
  const [status, setStatus] = useState<SaveStatus>({ state: "saved" });
  const initialJson = useMemo(() => JSON.stringify(initial), [initial]);
  const lastSaved = useRef(initialJson);
  const latest = useRef<Data | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlight = useRef(false);
  const edited = useRef(false);
  const mounted = useRef(true);

  const runRef = useRef<() => void>(() => {});
  const schedule = useCallback((ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => runRef.current(), ms);
  }, []);

  const run = useCallback(async () => {
    timer.current = null;
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
      const result = await saveDraft(siteId, data);
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
  }, [siteId, schedule]);

  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const onChange = useCallback(
    (data: Data) => {
      const json = JSON.stringify(data);
      // Puck reports the page once when it loads; nothing changed.
      if (json === lastSaved.current && !latest.current) return;
      latest.current = data;
      if (!edited.current && json !== initialJson) {
        edited.current = true;
        track("site_edited", { site_id: siteId });
      }
      setStatus((s) => (s.state === "invalid" || s.state === "retrying" ? s : { state: "saving" }));
      schedule(1000);
    },
    [initialJson, schedule, siteId],
  );

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { status, onChange };
}

/** The iframe gets the site fonts' CSS variables (globals.css is copied in by Puck). */
function IframeFonts({ children, document: doc }: { children: React.ReactNode; document?: Document }) {
  useEffect(() => {
    if (!doc) return;
    const classes = siteFontVars.split(" ");
    doc.body.classList.add(...classes);
    return () => doc.body.classList.remove(...classes);
  }, [doc]);
  return <>{children}</>;
}

const overrides: Partial<Overrides> = {
  iframe: IframeFonts,
  componentOverlay: SectionOverlay,
  actionBar: SectionActionBar,
  drawerItem: AddTile,
};

export function Editor({ site }: { site: EditorSite }) {
  const { status, onChange } = useAutosave(site.id, site.draft);
  const value = useMemo(() => ({ site, status }), [site, status]);
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
        <EditorLayout />
      </Puck>
    </EditorContext.Provider>
  );
}
