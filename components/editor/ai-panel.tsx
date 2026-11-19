"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { createUsePuck, type Data } from "@puckeditor/core";
import { ArrowUp, Check, LoaderCircle, Sparkles, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { undoAiChange } from "@/app/(main)/sites/[id]/edit/actions";
import { track } from "@/lib/analytics/client";
import type { UseCase } from "@/lib/analytics/events";
import type { RunResult, RunUIMessage } from "@/lib/ai/run";
import { SECTION_CATALOG } from "@/lib/sections/catalog";
import { SECTION_TYPES, type SectionType } from "@/lib/sections/schemas";
import type { PageData } from "@/lib/site/types";
import { useEditor } from "./editor";

const usePuck = createUsePuck();

const MAX_PROMPT = 1000;

/** The pending build `/new` leaves in sessionStorage, and what a build is started with. */
type BuildRequest = { prompt: string; businessName?: string; tone?: string; useCase: UseCase };

/** A chat edit: the selected section's id, when one is selected. */
type EditRequest = { prompt: string; selectedId: string | null };

type RunRequest = ({ kind: "generate" } & BuildRequest) | ({ kind: "edit" } & EditRequest);

type GuardCode = "ai_disabled" | "busy" | "rate_limited" | "ai_limit";

/** Design-system §6 copy for the guard codes (`ai_limit` is a toast, see below). */
const GUARD_COPY: Record<Exclude<GuardCode, "ai_limit">, string> = {
  ai_disabled: "AI is paused for a few minutes. You can still edit your site by hand.",
  busy: "The AI is still working on your last request.",
  rate_limited: "That's a lot of requests in an hour. Try again in a few minutes.",
};

const BUILD_FAILED = "Something went wrong building your site. Try again (this request wasn't counted).";
const EDIT_FAILED = "That change didn't work, so nothing on your page changed. Try again (this request wasn't counted).";

/** `doing` is the row's "…ing" text, shown in the canvas pill until the next row starts. */
type LogRow = { key: string; text: string; doing: string; done: boolean };

type AiRun = {
  building: boolean;
  /** "Undo AI change" is restoring the page: the composer and hand editing wait. */
  undoing: boolean;
  /** The kind of the current (or last) run. */
  kind: "generate" | "edit";
  messages: RunUIMessage[];
  /** The guard code of the last request, when the server refused it. */
  guardCode: GuardCode | null;
  /** The last request failed (model error, invalid page, timeout or a dropped connection). */
  failed: boolean;
  /** The "…ing" text of the build log's current row, for the canvas pill. */
  statusText: string;
  /** The user's onboarding answer, sent with runs started from the composer. */
  useCase: UseCase;
  start: (request: BuildRequest) => void;
  edit: (request: EditRequest) => void;
  retry: () => void;
  /** The run whose change "Undo AI change" can undo now (the most recent one), or null. */
  undoableRunId: string | null;
  undo: () => void;
};

const AiRunContext = createContext<AiRun | null>(null);

export function useAiRun() {
  const ctx = useContext(AiRunContext);
  if (!ctx) throw new Error("useAiRun must be used inside <AiRunProvider>");
  return ctx;
}

const lower = (type: string) => SECTION_CATALOG[type as SectionType]?.label.toLowerCase() ?? "a section";
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type ToolPart = { type: string; toolCallId: string; state: string; input?: Record<string, unknown>; output?: { ok?: boolean } };

/** One row per setSiteSettings and addSection call (findImages, update, remove and move aren't shown). Failed calls are hidden. */
function buildLog(message: RunUIMessage | undefined, root: Record<string, unknown>): LogRow[] {
  if (!message) return [];
  const rows: LogRow[] = [];
  for (const part of message.parts as ToolPart[]) {
    const done = part.state === "output-available";
    if (done && part.output?.ok === false) continue;
    if (part.state === "output-error") continue;
    if (part.type === "tool-setSiteSettings") {
      const theme = String(part.input?.theme ?? root.theme ?? "paper");
      const font = String(part.input?.font ?? root.font ?? "sans");
      const doing = "Picking a theme…";
      rows.push({ key: part.toolCallId, text: done ? `Picked the ${capitalize(theme)} theme and ${font} headings` : doing, doing, done });
    } else if (part.type === "tool-addSection") {
      const type = part.input?.type;
      if (typeof type !== "string" || !SECTION_TYPES.includes(type as SectionType)) continue;
      const doing = `Adding ${lower(type)}…`;
      rows.push({ key: part.toolCallId, text: done ? `Added ${lower(type)}` : doing, doing, done });
    }
  }
  return rows;
}

function readGuardCode(error: Error | undefined): GuardCode | null {
  if (!error) return null;
  try {
    const code = (JSON.parse(error.message) as { code?: string }).code;
    return code === "ai_disabled" || code === "busy" || code === "rate_limited" || code === "ai_limit" ? code : null;
  } catch {
    return null;
  }
}

const BUILD_IN = ["motion-safe:animate-build-in"];

function findSection(id: string) {
  const frame = document.getElementById("preview-frame") as HTMLIFrameElement | null;
  const doc = frame?.contentDocument;
  const el = doc?.querySelector<HTMLElement>(`[data-puck-component="${CSS.escape(id)}"]`);
  return frame && doc?.defaultView && el ? { frame, win: doc.defaultView, el } : null;
}

/**
 * The section the AI just added: a 3 px `marker` outline at screen size (the canvas is scaled down to fit),
 * `animate-build-in`, and the canvas scrolls to it. Returns a function that removes the highlight.
 */
function highlightSection(id: string, { animate = true, scroll = true } = {}) {
  const found = findSection(id);
  if (!found) return () => {};
  const { frame, win, el } = found;
  const scale = frame.offsetWidth ? frame.getBoundingClientRect().width / frame.offsetWidth : 1;
  el.style.outline = `${3 / scale}px solid var(--marker)`;
  el.style.outlineOffset = `${-3 / scale}px`;
  if (animate) el.classList.add(...BUILD_IN);
  if (scroll) {
    const top = el.getBoundingClientRect().top + win.scrollY - 24;
    win.scrollTo({ top, behavior: win.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  return () => {
    el.style.outline = "";
    el.style.outlineOffset = "";
    el.classList.remove(...BUILD_IN);
  };
}

/** Ids of the sections in `page` that are new or changed since `before`. */
function changedSections(before: PageData, page: PageData) {
  const old = new Map(before.content.map((s) => [s.props.id, JSON.stringify(s)]));
  return page.content.filter((s) => old.get(s.props.id) !== JSON.stringify(s)).map((s) => s.props.id);
}

/**
 * Holds the AI run (useChat on /api/ai/generate for builds, /api/ai/edit for chat edits) for the whole editor, so a build keeps going while the AI sheet
 * is closed below 1024 px. Every `data-page` part replaces the canvas; `data-run` ends the run.
 */
export function AiRunProvider({ useCase, children }: { useCase: UseCase; children: React.ReactNode }) {
  const { site, building, setBuilding, markSaved, setUsage, usage, flushSave, handEditRef } = useEditor();
  const dispatch = usePuck((s) => s.dispatch);
  const data = usePuck((s) => s.appState.data);
  const dataRef = useRef<Data>(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);
  const root = (data.root.props ?? {}) as Record<string, unknown>;

  const [newest, setNewest] = useState<string | null>(null);
  /** Edit runs: the sections changed so far (marker outline while the run lasts), and a counter of page updates. */
  const [changed, setChanged] = useState<{ ids: string[]; version: number }>({ ids: [], version: 0 });
  const before = useRef<Data | null>(null); // the page before the run, restored if it fails
  const lastPage = useRef<PageData | null>(null);
  const ended = useRef(true);
  const lastRequest = useRef<RunRequest | null>(null);
  const [kind, setKind] = useState<"generate" | "edit">("generate");
  const [failed, setFailed] = useState(false);
  const [undoableRunId, setUndoableRunId] = useState<string | null>(null);
  const [undoing, setUndoing] = useState(false);

  // A hand edit after an AI change hides "Undo AI change"
  useEffect(() => {
    handEditRef.current = () => setUndoableRunId(null);
    return () => {
      handEditRef.current = null;
    };
  }, [handEditRef]);

  const endRun = useCallback(
    (result: RunResult | null) => {
      if (ended.current) return;
      ended.current = true;
      if (result?.status === "succeeded" && lastPage.current) {
        const data = lastPage.current as unknown as Data;
        markSaved(data);
        dispatch({ type: "setData", data, recordHistory: true });
        if (result.changed) setUndoableRunId(result.runId);
      } else if (before.current) {
        dispatch({ type: "setData", data: before.current, recordHistory: false });
        setFailed(true);
      }
      if (result?.left !== undefined && result.total !== undefined) setUsage({ left: result.left, total: result.total });
      setNewest(null);
      setChanged({ ids: [], version: 0 });
      setBuilding(false);
    },
    [dispatch, markSaved, setBuilding, setUsage],
  );

  // Only the request goes to the server (not the conversation); `kind` picks the route.
  const transport = useMemo(
    () =>
      new DefaultChatTransport<RunUIMessage>({
        api: "/api/ai/generate",
        prepareSendMessagesRequest: ({ body }) => {
          const { kind, ...rest } = (body ?? {}) as Partial<RunRequest> & { siteId?: string };
          return { api: kind === "edit" ? "/api/ai/edit" : "/api/ai/generate", body: rest };
        },
      }),
    [],
  );
  const { messages, setMessages, sendMessage, regenerate, status, error, clearError } = useChat<RunUIMessage>({
    transport,
    onData: (part) => {
      if (part.type === "data-page") {
        const page = part.data;
        const previous = new Set((lastPage.current ?? (dataRef.current as unknown as PageData)).content.map((s) => s.props.id));
        const added = page.content.filter((s) => !previous.has(s.props.id)).at(-1);
        lastPage.current = page;
        dispatch({ type: "setData", data: page as unknown as Data, recordHistory: false });
        if (lastRequest.current?.kind === "edit") {
          const ids = before.current ? changedSections(before.current as unknown as PageData, page) : [];
          setChanged((c) => ({ ids, version: c.version + 1 }));
        } else if (added) setNewest(added.props.id);
      } else if (part.type === "data-run") {
        endRun(part.data);
      }
    },
    onError: (err) => {
      const code = readGuardCode(err);
      if (code === "ai_limit") toast(`You've used all ${usage.total} AI requests this month`);
      endRun(null);
      if (code) setFailed(false);
    },
    onFinish: () => endRun(null),
  });

  // The newest section gets the marker outline and the canvas follows it (after Puck has rendered it)
  useEffect(() => {
    if (!newest) return;
    let clear = () => {};
    const t = setTimeout(() => (clear = highlightSection(newest)), 60);
    return () => {
      clearTimeout(t);
      clear();
    };
  }, [newest]);

  // Edit runs: every changed section keeps the marker outline while the run lasts; the canvas follows the first
  useEffect(() => {
    if (!changed.ids.length) return;
    let clears: (() => void)[] = [];
    const t = setTimeout(() => {
      clears = changed.ids.map((id, i) => highlightSection(id, { animate: false, scroll: i === 0 }));
    }, 60);
    return () => {
      clearTimeout(t);
      clears.forEach((clear) => clear());
    };
  }, [changed]);

  const begin = useCallback(
    (request: RunRequest) => {
      lastRequest.current = request;
      before.current = dataRef.current;
      lastPage.current = null;
      ended.current = false;
      setKind(request.kind);
      setFailed(false);
      clearError();
      setBuilding(true);
    },
    [clearError, setBuilding],
  );

  const start = useCallback(
    (request: BuildRequest) => {
      if (!ended.current) return;
      const run: RunRequest = { kind: "generate", ...request };
      begin(run);
      void sendMessage({ text: request.prompt }, { body: { siteId: site.id, ...run } });
    },
    [begin, sendMessage, site.id],
  );

  const edit = useCallback(
    async (request: EditRequest) => {
      if (!ended.current) return;
      const run: RunRequest = { kind: "edit", ...request };
      begin(run);
      // The server's draft must be the page the user sees: save it first
      if (!(await flushSave(dataRef.current))) {
        ended.current = true;
        setBuilding(false);
        setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: request.prompt }] }]);
        setFailed(true);
        return;
      }
      void sendMessage({ text: request.prompt }, { body: { siteId: site.id, ...run } });
    },
    [begin, flushSave, sendMessage, setBuilding, setMessages, site.id],
  );

  const retry = useCallback(() => {
    const request = lastRequest.current;
    if (!request || request.kind !== "generate" || !ended.current) return;
    begin(request);
    void regenerate({ body: { siteId: site.id, ...request } });
  }, [begin, regenerate, site.id]);

  const undo = useCallback(async () => {
    const runId = undoableRunId;
    if (!runId || !ended.current || undoing) return;
    // Hand editing, autosave and new AI requests wait until the page is restored
    setUndoing(true);
    setBuilding(true);
    try {
      const page = await undoAiChange(site.id, runId);
      const data = page as unknown as Data;
      markSaved(data);
      dispatch({ type: "setData", data, recordHistory: true });
      setUndoableRunId(null);
      toast("Undid the AI change");
      track("ai_change_undone", { site_id: site.id });
    } catch (err) {
      console.warn(`Undo failed: ${err instanceof Error ? err.message : err}`);
    } finally {
      setBuilding(false);
      setUndoing(false);
    }
  }, [dispatch, markSaved, setBuilding, site.id, undoableRunId, undoing]);

  // The pending build from /new starts once, when the editor opens. It waits a tick: useChat aborts a message
  // that is still being prepared when the component unmounts (React's dev double mount does exactly that).
  useEffect(() => {
    const timer = setTimeout(() => {
      let pending: Partial<BuildRequest> | null = null;
      try {
        const key = `pending-build:${site.id}`;
        const raw = sessionStorage.getItem(key);
        if (raw) {
          sessionStorage.removeItem(key);
          pending = JSON.parse(raw) as Partial<BuildRequest>;
        }
      } catch {
        pending = null;
      }
      if (pending?.prompt) {
        start({
          prompt: pending.prompt.slice(0, MAX_PROMPT),
          businessName: pending.businessName,
          tone: pending.tone,
          useCase: pending.useCase ?? useCase,
        });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [site.id, start, useCase]);

  const last = messages.at(-1);
  const rows = building && last?.role === "assistant" ? buildLog(last, root) : [];
  // The current row, or the last one until the next starts; "Picking a theme…" before the first
  const statusText = (rows.findLast((r) => !r.done) ?? rows.at(-1))?.doing ?? "Picking a theme…";

  const value = useMemo<AiRun>(
    () => ({
      building: (building && !undoing) || status === "submitted",
      undoing,
      kind,
      messages,
      guardCode: readGuardCode(error),
      failed: failed || (!!error && !readGuardCode(error)),
      statusText,
      useCase,
      start,
      edit,
      retry,
      undoableRunId,
      undo,
    }),
    [building, undoing, status, kind, messages, error, failed, statusText, useCase, start, edit, retry, undoableRunId, undo],
  );

  return (
    <AiRunContext.Provider value={value}>
      {children}
    </AiRunContext.Provider>
  );
}

/** The sticky status pill at the top of the canvas while the AI builds a new site. */
export function BuildStatusPill() {
  const { building, kind, statusText } = useAiRun();
  if (!building || kind !== "generate") return null;
  return (
    <div
      className="sticky top-0 z-10 mx-auto mb-4 flex w-fit max-w-full shrink-0 items-center gap-2 rounded-full border border-border bg-card py-1.5 pr-4 pl-3 text-sm font-medium shadow-sm"
      role="status"
    >
      <span className="size-2.5 shrink-0 rounded-full bg-marker motion-safe:animate-marker-pulse" />
      <span className="truncate">{statusText}</span>
    </div>
  );
}

function AssistantMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-marker-soft">
        <Sparkles className="size-3.5" aria-hidden="true" />
      </span>
      <div>{children}</div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-muted px-3.5 py-2.5 leading-relaxed wrap-break-word">{text}</div>;
}

function BuildLog({ rows }: { rows: LogRow[] }) {
  return (
    <div className="rounded-xl border border-border p-3.5">
      <p className="flex items-center gap-2 font-semibold">
        <span className="size-2.5 rounded-full bg-marker motion-safe:animate-marker-pulse" />
        Building your site
      </p>
      {rows.length > 0 && (
        <ol className="mt-3 space-y-2.5">
          {rows.map((row) =>
            row.done ? (
              <li key={row.key} className="flex items-center gap-2.5 text-muted-foreground">
                <Check className="size-4 shrink-0 text-foreground" aria-hidden="true" />
                {row.text}
              </li>
            ) : (
              <li key={row.key} className="flex items-center gap-2.5 font-medium">
                <LoaderCircle className="size-4 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
                {row.text}
              </li>
            ),
          )}
        </ol>
      )}
    </div>
  );
}


function FailedMessage({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <AssistantMessage>
      <p className="leading-relaxed">{text}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-md border border-input bg-card px-2.5 text-xs font-medium hover:bg-accent sm:h-7"
        >
          Try again
        </button>
      )}
    </AssistantMessage>
  );
}

/** "Undo AI change" under the most recent AI change. */
function UndoButton({ onUndo, disabled }: { onUndo: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onUndo}
      disabled={disabled}
      className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-md border border-input bg-card px-2.5 text-xs font-medium hover:bg-accent disabled:pointer-events-none disabled:opacity-40 sm:h-7"
    >
      <Undo2 className="size-3.5" aria-hidden="true" />
      Undo AI change
    </button>
  );
}

/** The single assistant row while an edit runs. */
function WorkingMessage() {
  return (
    <AssistantMessage>
      <p className="flex items-center gap-2 leading-relaxed">
        <span className="size-2.5 shrink-0 rounded-full bg-marker motion-safe:animate-marker-pulse" />
        Working on it…
      </p>
    </AssistantMessage>
  );
}

const textOf = (m: RunUIMessage) =>
  m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");

/** The model's final reply: the text of its last step. */
function finalReply(m: RunUIMessage) {
  const lastStep = m.parts.findLastIndex((p) => p.type === "step-start");
  return m.parts
    .slice(lastStep + 1)
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
    .trim();
}

const isTouch = () => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/** The AI tab: the conversation, the build log or "Working on it…" while a run lasts, and the composer with the selection chip and the usage line. */
export function AiPanel() {
  const { building: running, undoing, kind, messages, guardCode, failed, useCase, start, edit, retry, undoableRunId, undo } = useAiRun();
  const building = running || undoing;
  const { usage } = useEditor();
  const empty = usePuck((s) => s.appState.data.content.length === 0);
  const selected = usePuck((s) => s.selectedItem);
  const dispatch = usePuck((s) => s.dispatch);
  const [prompt, setPrompt] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // An empty page is built (generate); after the first build every request is an edit
  const selectedId = !empty && typeof selected?.props?.id === "string" ? (selected.props.id as string) : null;
  const selectedLabel = selected ? (SECTION_CATALOG[selected.type as SectionType]?.label ?? selected.type) : null;
  const placeholder =
    building && kind === "generate"
      ? "You can ask for changes when the build finishes"
      : empty
        ? "Describe your site and I'll build it"
        : "Ask for a change…";

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, building]);

  const submit = () => {
    const text = prompt.trim().slice(0, MAX_PROMPT);
    if (building || !text) return;
    if (empty) start({ prompt: text, useCase });
    else void edit({ prompt: text, selectedId });
    setPrompt("");
  };

  const lastIndex = messages.length - 1;
  const lastKind = (m: RunUIMessage) => (m.parts.find((p) => p.type === "data-run")?.data as RunResult | undefined)?.kind;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="flex-1 space-y-5 overflow-y-auto p-4 text-sm" aria-live="polite">
        {messages.map((m, i) => {
          if (m.role === "user") return <UserBubble key={m.id} text={textOf(m)} />;
          if (m.role !== "assistant") return null;
          const run = m.parts.find((p) => p.type === "data-run")?.data as RunResult | undefined;
          const isLast = i === lastIndex;
          const undoHere = run?.status === "succeeded" && run.runId === undoableRunId && (
            <UndoButton onUndo={undo} disabled={building} />
          );
          if (run?.status === "succeeded" && run.kind === "generate") {
            return (
              <AssistantMessage key={m.id}>
                <p className="leading-relaxed">
                  Built your site with {run.sections} sections. Click any section to edit it, or ask me for changes.
                </p>
                {undoHere}
              </AssistantMessage>
            );
          }
          if (run?.status === "succeeded") {
            const reply = finalReply(m);
            return (
              <AssistantMessage key={m.id}>
                {reply && <p className="leading-relaxed">{reply}</p>}
                {undoHere}
              </AssistantMessage>
            );
          }
          if (isLast && running) return kind === "edit" ? <WorkingMessage key={m.id} /> : <BuildLogFor key={m.id} message={m} />;
          const runKind = run?.kind ?? (isLast ? kind : lastKind(m)) ?? "generate";
          return runKind === "edit" ? (
            <FailedMessage key={m.id} text={EDIT_FAILED} />
          ) : (
            <FailedMessage key={m.id} text={BUILD_FAILED} onRetry={isLast && !building ? retry : undefined} />
          );
        })}
        {messages.at(-1)?.role === "user" && running && (kind === "edit" ? <WorkingMessage /> : <BuildLog rows={[]} />)}
        {messages.at(-1)?.role === "user" && !building && guardCode && guardCode !== "ai_limit" && (
          <AssistantMessage>
            <p className="leading-relaxed">{GUARD_COPY[guardCode]}</p>
          </AssistantMessage>
        )}
        {messages.at(-1)?.role === "user" && !building && !guardCode && failed &&
          (kind === "edit" ? <FailedMessage text={EDIT_FAILED} /> : <FailedMessage text={BUILD_FAILED} onRetry={retry} />)}
      </div>
      <form
        className="border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="rounded-xl border border-input bg-card focus-within:ring-2 focus-within:ring-ring/30">
          {selectedId && selectedLabel && (
            <div className="flex items-center gap-1.5 px-3 pt-2.5 text-xs">
              <span className="text-muted-foreground">Changes apply to</span>
              <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-muted py-0.5 pr-1 pl-2 font-medium">
                <span className="truncate">{selectedLabel}</span>
                <button
                  type="button"
                  disabled={building}
                  onClick={() => dispatch({ type: "setUi", ui: { itemSelector: null }, recordHistory: false })}
                  className="-my-3 -mr-3 grid size-10 shrink-0 place-items-center rounded hover:bg-input/30 sm:m-0 sm:size-4"
                  aria-label="Apply to the whole page instead"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            </div>
          )}
          <label htmlFor="ask" className="sr-only">
            Ask for a change
          </label>
          <textarea
            id="ask"
            rows={2}
            maxLength={MAX_PROMPT}
            disabled={building}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter adds a line; on touch devices Enter adds a line and Send sends
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && !isTouch()) {
                e.preventDefault();
                submit();
              }
            }}
            className="block w-full resize-none bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed sm:text-sm"
            placeholder={placeholder}
          />
          <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
            <span className="min-w-0 text-xs text-muted-foreground">
              {usage.left} of {usage.total} AI requests left this month
            </span>
            <button
              type="submit"
              disabled={building || !prompt.trim()}
              className="grid size-10 shrink-0 place-items-center rounded-md bg-marker text-marker-foreground hover:bg-marker/85 disabled:opacity-40 sm:size-8"
              aria-label="Send"
            >
              <ArrowUp className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function BuildLogFor({ message }: { message: RunUIMessage }) {
  const root = usePuck((s) => (s.appState.data.root.props ?? {}) as Record<string, unknown>);
  return <BuildLog rows={buildLog(message, root)} />;
}
