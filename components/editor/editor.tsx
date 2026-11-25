"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Puck, useGetPuck, type Data, type OnAction, type Overrides } from "@puckeditor/core";
import { saveDraft } from "@/app/(main)/sites/[id]/edit/actions";
import { useToast } from "@/components/app/toast";
import { track } from "@/lib/analytics/client";
import { CATALOG } from "@/lib/sections/catalog";
import type { SectionType } from "@/lib/sections/schemas";
import { puckConfig } from "@/lib/site/puck-config";
import type { PageData } from "@/lib/site/types";
import { ActionBar, ComponentOverlay } from "./action-bar";
import { DrawerItem } from "./add-panel";
import { Canvas, CanvasFrame } from "./canvas";
import { FieldsPanel } from "./fields-panel";
import { LeftPanel } from "./left-panel";
import { ROOT_ZONE } from "./puck";
import { TopBar, type Device, type SaveState } from "./top-bar";

export type EditorSite = { id: string; name: string; slug: string | null; draft: PageData; publishedAt: string | null };

const DEBOUNCE_MS = 800;
const RETRY_MS = 3000;

// What gets stored: the page itself, without Puck's UI bits.
const pageJson = (data: Partial<Data>) => JSON.stringify({ root: data.root, content: data.content });

// Debounced autosave through saveDraft. Sends site_edited on the first change made by hand.
function useAutosave(siteId: string, initial: PageData) {
  const [state, setState] = useState<SaveState>({ kind: "saved" });
  const [initialJson] = useState(() => pageJson(initial));
  const seen = useRef(initialJson);            // the latest page Puck showed us
  const saved = useRef(initialJson);           // the latest page the server accepted
  const latest = useRef<Data | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef(false);
  const edited = useRef(false);
  const blocked = useRef(false);               // pending changes, or the page can't be saved
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const later = (ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveRef.current(), ms);
  };

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const data = latest.current;
    if (!data || inflight.current) return;
    const json = pageJson(data);
    if (json === saved.current) {
      blocked.current = false;
      setState({ kind: "saved" });
      return;
    }
    inflight.current = true;
    try {
      const res = await saveDraft(siteId, { root: data.root, content: data.content, zones: data.zones ?? {} });
      if (res.ok) saved.current = json;
      const changedSince = pageJson(latest.current ?? data) !== json;
      if (changedSince) {
        later(DEBOUNCE_MS);
      } else if (res.ok) {
        blocked.current = false;
        setState({ kind: "saved" });
      } else {
        setState({ kind: "invalid", message: res.message, path: res.path });
      }
    } catch {
      setState({ kind: "retrying" });
      later(RETRY_MS);
    } finally {
      inflight.current = false;
    }
  }, [siteId]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const onChange = useCallback((data: Data) => {
    const json = pageJson(data);
    if (json === seen.current) return;
    seen.current = json;
    latest.current = data;
    blocked.current = true;
    if (!edited.current) {
      edited.current = true;
      track("site_edited", { site_id: siteId });
    }
    setState({ kind: "saving" });
    later(DEBOUNCE_MS);
  }, [siteId]);

  // Leaving while a save is pending or the page can't be saved asks first.
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (!blocked.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return { state, onChange, saveNow: save };
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

// ⌘Z / Ctrl+Z undo, ⇧⌘Z / Ctrl+Shift+Z / Ctrl+Y redo, ⌘S / Ctrl+S save now, Esc clears the selection.
// Only ⌘S works while typing in a field. Keys pressed inside the canvas iframe are forwarded here (CanvasFrame).
function Shortcuts({ saveNow }: { saveNow: () => void }) {
  const getPuck = useGetPuck();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && key === "s") {
        e.preventDefault();
        saveNow();
        return;
      }
      if (isTyping(e.target)) return;
      const { history, dispatch } = getPuck();
      if (mod && key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (history.hasPast) history.back();
      } else if ((mod && key === "z" && e.shiftKey) || (e.ctrlKey && key === "y")) {
        e.preventDefault();
        if (history.hasFuture) history.forward();
      } else if (key === "escape") {
        dispatch({ type: "setUi", ui: { itemSelector: null } });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [getPuck, saveNow]);
  return null;
}

export function Editor({ site }: { site: EditorSite }) {
  const [device, setDevice] = useState<Device>("desktop");
  const { state, onChange, saveNow } = useAutosave(site.id, site.draft);
  const toast = useToast();

  const onAction = useCallback<OnAction>((action, _next, prev) => {
    if (action.type !== "remove" || action.zone !== ROOT_ZONE) return;
    const removed = prev.data.content[action.index];
    const label = removed && CATALOG[removed.type as SectionType]?.label;
    if (label) toast.show(`${label} removed. Undo brings it back.`);
  }, [toast]);

  const overrides = useMemo<Partial<Overrides>>(() => ({
    drawerItem: DrawerItem,
    actionBar: ActionBar,
    componentOverlay: ComponentOverlay,
    iframe: CanvasFrame,
  }), []);

  return (
    <Puck
      config={puckConfig}
      data={site.draft}
      onChange={onChange}
      onAction={onAction}
      iframe={{ enabled: true }}
      overrides={overrides}
    >
      <Shortcuts saveNow={saveNow} />
      <main className="ed">
        <TopBar live={!!site.publishedAt} save={state} device={device} onDevice={setDevice} />
        <div className="ed-body">
          <LeftPanel />
          <Canvas device={device} />
          <FieldsPanel />
        </div>
      </main>
    </Puck>
  );
}
