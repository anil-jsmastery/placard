"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Puck, useGetPuck, type Data, type OnAction, type Overrides } from "@puckeditor/core";
import { publishSite, saveDraft } from "@/app/(main)/sites/[id]/edit/actions";
import { useToast } from "@/components/app/toast";
import { LiveUsageRows } from "@/components/app/usage-meter-live";
import { track } from "@/lib/analytics/client";
import { siteHost, siteUrl } from "@/lib/config";
import { CATALOG } from "@/lib/sections/catalog";
import type { SectionType } from "@/lib/sections/schemas";
import { puckConfig } from "@/lib/site/puck-config";
import type { EditorMetadata } from "@/lib/site/puck-config";
import type { PageData, SectionData } from "@/lib/site/types";
import type { LiveUsage } from "@/lib/usage";
import { ActionBar, ComponentOverlay } from "./action-bar";
import { DrawerItem } from "./add-panel";
import { Canvas, CanvasFrame } from "./canvas";
import type { AiActions, RunKind, UndoRun } from "./ai-panel";
import { FieldsPanel } from "./fields-panel";
import { LeftPanel, type Tab } from "./left-panel";
import { ROOT_ZONE } from "./puck";
import { TopBar, type Device, type SaveState } from "./top-bar";

export type EditorSite = { id: string; name: string; slug: string | null; draft: PageData; live: boolean; publishedAt: string | null; aiRuns: number };
export type EditorUser = { useCase: string; usage: LiveUsage };

const DEBOUNCE_MS = 800;
const RETRY_MS = 3000;

// What gets stored: the page itself, without Puck's UI bits.
const pageJson = (data: Partial<Data>) => JSON.stringify({ root: data.root, content: data.content });

// Debounced autosave through saveDraft. Sends site_edited on the first change made by hand.
// While an AI run is going it's paused: the server saves the run's result (markSaved tells it what's stored).
// onHandEdit hears every change made by hand (not the AI's, not an undo of the AI's).
function useAutosave(siteId: string, initial: PageData, onHandEdit: () => void) {
  const [state, setState] = useState<SaveState>({ kind: "saved" });
  const [initialJson] = useState(() => pageJson(initial));
  const seen = useRef(initialJson);            // the latest page Puck showed us
  const saved = useRef(initialJson);           // the latest page the server accepted
  const latest = useRef<Data | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<Promise<void> | null>(null); // the save on its way to the server
  const edited = useRef(false);
  const blocked = useRef(false);               // pending changes, or the page can't be saved
  const paused = useRef(false);                // an AI run is going
  const saveRef = useRef<() => Promise<void>>(async () => {});
  const later = (ms: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void saveRef.current(), ms);
  };

  const save = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const data = latest.current;
    if (!data || inflight.current || paused.current) return;
    const json = pageJson(data);
    if (json === saved.current) {
      blocked.current = false;
      setState({ kind: "saved" });
      return;
    }
    let release = () => {};
    inflight.current = new Promise<void>((resolve) => (release = resolve));
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
      inflight.current = null;
      release();
    }
  }, [siteId]);

  // Before an AI run: wait for any save on its way, save what's left, and say whether the server has the page.
  const flush = useCallback(async () => {
    while (inflight.current) await inflight.current;
    await save();
    while (inflight.current) await inflight.current;
    const data = latest.current;
    return !data || pageJson(data) === saved.current;
  }, [save]);

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const onChange = useCallback((data: Data) => {
    const json = pageJson(data);
    if (json === seen.current) return;
    seen.current = json;
    latest.current = data;
    if (paused.current) return;
    onHandEdit();
    blocked.current = true;
    if (!edited.current) {
      edited.current = true;
      track("site_edited", { site_id: siteId });
    }
    setState({ kind: "saving" });
    later(DEBOUNCE_MS);
  }, [siteId, onHandEdit]);

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

  const pause = useCallback((on: boolean) => {
    paused.current = on;
  }, []);
  // The page the server has now (an AI run's result, or the page from before a failed run).
  const markSaved = useCallback((page: PageData) => {
    const json = pageJson(page as unknown as Data);
    latest.current = { ...(latest.current ?? {}), root: page.root, content: page.content } as Data;
    seen.current = json;
    saved.current = json;
    blocked.current = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setState({ kind: "saved" });
  }, []);

  return { state, onChange, saveNow: save, flush, pause, markSaved };
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));

// ⌘Z / Ctrl+Z undo, ⇧⌘Z / Ctrl+Shift+Z / Ctrl+Y redo, ⌘S / Ctrl+S save now, Esc clears the selection.
// Only ⌘S works while typing in a field. Keys pressed inside the canvas iframe are forwarded here (CanvasFrame).
function Shortcuts({ saveNow, locked }: { saveNow: () => void; locked: boolean }) {
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
      if (isTyping(e.target) || locked) return;
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
  }, [getPuck, saveNow, locked]);
  return null;
}

// While the AI runs, nothing on the page can be changed by hand.
const LOCKED = { drag: false, duplicate: false, delete: false, edit: false, insert: false };

export function Editor({ site, user }: { site: EditorSite; user: EditorUser }) {
  const [device, setDevice] = useState<Device>("desktop");
  const [runKind, setRunKind] = useState<RunKind | null>(null);
  const running = runKind !== null;
  const [tab, setTab] = useState<Tab>("ai");
  // Only the newest AI change can be undone, until a newer one arrives or the page is edited by hand.
  const [undoRun, setUndoRun] = useState<UndoRun | null>(null);
  const clearUndo = useCallback(() => setUndoRun(null), []);
  const aiActions = useRef<AiActions | null>(null);
  const { state, onChange: autosave, saveNow, flush, pause, markSaved } = useAutosave(site.id, site.draft, clearUndo);
  const toast = useToast();

  // Publish / Update site: save what's pending first, then copy the draft to the live page.
  const [live, setLive] = useState(site.live);
  const [address, setAddress] = useState(() => (site.slug ? { host: siteHost(site.slug), url: siteUrl(site.slug) } : null));
  const [publishing, setPublishing] = useState(false);
  const publish = useCallback(async () => {
    if (publishing || running) return;
    setPublishing(true);
    try {
      if (!(await flush())) return;
      const res = await publishSite(site.id);
      if (!res.ok) {
        toast.show(`Can't save: ${res.message} (${res.path})`);
        return;
      }
      toast.show(live ? "Your live portfolio is up to date." : `Published. Live at ${res.host}`);
      setAddress({ host: res.host, url: res.url });
      setLive(true);
    } catch {
      toast.show("Something went wrong. Try again.");
    } finally {
      setPublishing(false);
    }
  }, [publishing, running, flush, site.id, toast, live]);

  // The visible sections go to root.render through Puck's metadata, so the canvas nav matches the published one.
  const [content, setContent] = useState(site.draft.content);
  const metadata = useMemo<EditorMetadata>(() => ({ content: content.filter((s) => !s.props.hidden) }), [content]);
  const onChange = useCallback((data: Data) => {
    setContent(data.content as SectionData[]);
    autosave(data);
  }, [autosave]);

  const onRunning = useCallback((kind: RunKind | null) => {
    pause(kind !== null);
    setRunKind(kind);
  }, [pause]);

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
      metadata={metadata}
      iframe={{ enabled: true }}
      overrides={overrides}
      permissions={running ? LOCKED : undefined}
    >
      <Shortcuts saveNow={saveNow} locked={running} />
      <main className="ed">
        <TopBar
          live={live} save={state} device={device} onDevice={setDevice} locked={running}
          prettifying={runKind === "prettify"} onPrettify={() => aiActions.current?.prettify()}
          publishing={publishing} onPublish={() => void publish()}
        />
        <div className="ed-body">
          {/* The composer's requests left are live (the sealed `ai-used` query). */}
          <LiveUsageRows usage={user.usage}>
            {(left, allowance) => (
              <LeftPanel
                tab={tab}
                setTab={setTab}
                ai={{
                  siteId: site.id, usage: { left, allowance }, running, onRunning,
                  beforeRun: flush, onSaved: markSaved, onTab: setTab, undoRun, setUndoRun, actionsRef: aiActions,
                  blankStart: site.draft.content.length === 0 && site.aiRuns === 0,
                }}
              />
            )}
          </LiveUsageRows>
          <Canvas device={device} prettifying={runKind === "prettify"} live={live ? address : null} />
          <FieldsPanel disabled={running} />
        </div>
      </main>
    </Puck>
  );
}
