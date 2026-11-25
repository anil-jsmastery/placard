"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useGetPuck, type Data } from "@puckeditor/core";
import { ArrowUp, Check, Sparkle, Undo2 } from "lucide-react";
import { getSiteState, undoAiChange } from "@/app/(main)/sites/[id]/edit/actions";
import { useToast } from "@/components/app/toast";
import { pendingBuildKey, type PendingBuild } from "@/components/new/describe-form";
import { track } from "@/lib/analytics/client";
import type { RunResult, SiteUIMessage } from "@/lib/ai/tools";
import { CATALOG } from "@/lib/sections/catalog";
import type { SectionType } from "@/lib/sections/schemas";
import { THEME_META } from "@/lib/site/themes";
import type { PageData } from "@/lib/site/types";
import type { Tab } from "./left-panel";
import { flashSection, revealSection, ROOT_ZONE, usePuck } from "./puck";

export type Usage = { left: number; allowance: number };
export type RunKind = "generate" | "edit" | "prettify";
export type UndoRun = { runId: string; kind: "edit" | "prettify" };
export type AiActions = { prettify: () => void };
type Brief = { name: string | null; tone: string | null; useCase: string };
type Turn = {
  kind: RunKind;
  prompt: string;
  brief?: Brief;
  selectedId?: string | null;
  from: number;
  code?: string;
  result?: RunResult;
  failed?: boolean;
  changes?: [string, string][];
};
type Row = { label: string; state: "" | "run" | "ok" };
type ToolPart = { type: string; state?: string; input?: { type?: SectionType }; output?: { ok?: boolean } };

// The copy for each guard code (design-system §7). ai_limit is a toast until Step 8's paywall.
const GUARD_COPY: Record<string, string> = {
  ai_disabled: "AI is paused for a few minutes. You can still edit your portfolio by hand.",
  busy: "The AI is still working on your last request.",
  rate_limited: "That's a lot of requests in an hour. Try again in a few minutes.",
};
const BUILD_FAILED = "Something went wrong building your portfolio. Try again (this request wasn't counted).";
const EDIT_FAILED = "That change didn't work, so nothing on your page changed. Try again (this request wasn't counted).";
const PRETTIFY_REJECTED = "Prettify tried to change your words, so I put the page back. Try again (this request wasn't counted).";
const EMPTY_PAGE = "Add a few sections first, then Prettify styles them.";
const CHIPS = ["Make the headline shorter", "Try a darker theme", "Shorten the about section"];

function codeOf(error: Error): string {
  try {
    const body = JSON.parse(error.message) as { code?: unknown };
    return typeof body.code === "string" ? body.code : "model_error";
  } catch {
    return "model_error";
  }
}

const toolParts = (message: SiteUIMessage | undefined) =>
  ((message?.parts ?? []) as ToolPart[]).filter((p) => p.type.startsWith("tool-"));
const succeeded = (p: ToolPart) => p.state === "output-available" && p.output?.ok === true;

// The build log rows, from the run's real tool calls.
function buildRows(message: SiteUIMessage | undefined, turn: Turn, themeName: string): Row[] {
  const parts = (message?.parts ?? []) as ToolPart[];
  const tools = toolParts(message);
  const ended = !!turn.result || turn.failed;
  const ok = turn.result?.ok === true;

  const reading = tools.length > 0 || ok;
  const themed = ok || tools.some((p) => p.type === "tool-setSiteSettings" && succeeded(p));
  const added = tools.filter((p) => p.type === "tool-addSection" && succeeded(p));
  const writing = tools.some((p) => p.type === "tool-addSection");
  const newest = added.at(-1)?.input?.type;
  const answered = parts.some((p) => p.type === "text");

  return [
    { label: "Reading what you do", state: reading ? "ok" : ended ? "" : "run" },
    { label: themed ? `Applying the ${themeName} theme` : "Choosing a theme", state: themed ? "ok" : reading && !ended ? "run" : "" },
    { label: `Writing your sections${newest ? ` · ${CATALOG[newest].label}` : ""}`, state: ok ? "ok" : writing && !ended ? "run" : "" },
    { label: "Checking it on mobile", state: ok ? "ok" : answered && !ended ? "run" : "" },
  ];
}

// Prettify's rows: the first is done at the first tool call, the second when setStyle succeeds (or at the end),
// the third at the end.
function prettifyRows(message: SiteUIMessage | undefined, turn: Turn): Row[] {
  const tools = toolParts(message);
  const ended = !!turn.result || turn.failed;
  const ok = turn.result?.ok === true;
  const looked = tools.length > 0 || ok;
  const styled = ok || tools.some((p) => p.type === "tool-setStyle" && succeeded(p));
  return [
    { label: "Looking at your sections", state: looked ? "ok" : ended ? "" : "run" },
    { label: "Choosing a theme and fonts", state: styled ? "ok" : looked && !ended ? "run" : "" },
    { label: "Picking layouts, spacing and photos", state: ok ? "ok" : styled && !ended ? "run" : "" },
  ];
}

const sortKeys = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(sortKeys)
  : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])]))
  : v;
const same = (a: unknown, b: unknown) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));

// The first section an edit added or changed.
function changedSection(before: PageData, after: PageData): string | null {
  for (const s of after.content) {
    const prev = before.content.find((p) => p.props.id === s.props.id);
    if (!prev || !same(prev, s)) return s.props.id;
  }
  return null;
}

function Who() {
  return <div className="who"><i><Sparkle fill="#fff" strokeWidth={0} /></i>Placard</div>;
}

function Steps({ rows }: { rows: Row[] }) {
  return (
    <ul className="steps">
      {rows.map((r) => <li key={r.label.split(" · ")[0]} className={r.state || undefined}><span className="dot"></span>{r.label}</li>)}
    </ul>
  );
}

// The AI tab: the conversation (builds, edits and Prettify), the selection chip, the composer and the usage line.
// The conversation lives in the browser for this editor session.
export function AiPanel({
  siteId, usage: initialUsage, running, onRunning, beforeRun, onSaved, onTab, undoRun, setUndoRun, actionsRef, blankStart,
}: {
  siteId: string;
  usage: Usage;
  running: boolean;
  onRunning: (kind: RunKind | null) => void;
  beforeRun: () => Promise<boolean>;
  onSaved: (page: PageData) => void;
  onTab: (tab: Tab) => void;
  undoRun: UndoRun | null;
  setUndoRun: (run: UndoRun | null) => void;
  actionsRef: React.RefObject<AiActions | null>;
  blankStart: boolean;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [usage, setUsage] = useState(initialUsage);
  const [showBlank, setShowBlank] = useState(false);
  const theme = usePuck((s) => s.appState.data.root.props?.theme as keyof typeof THEME_META | undefined);
  const selected = usePuck((s) => s.selectedItem);
  const dispatch = usePuck((s) => s.dispatch);
  const getPuck = useGetPuck();
  const toast = useToast();
  const before = useRef<PageData | null>(null);
  const runId = useRef<string | null>(null); // the current run's id, once the server has sent it
  const current = useRef<Turn | null>(null);
  const finished = useRef(true);
  const reconciling = useRef(false);
  const log = useRef<HTMLDivElement>(null);

  const selectedId = (selected?.props.id as string | undefined) ?? null;
  const selectedLabel = selected ? CATALOG[selected.type as SectionType]?.label : undefined;

  // Each run posts to its own route (/api/ai/generate, edit or prettify), passed with the request's body.
  const transport = useMemo(
    () => new DefaultChatTransport<SiteUIMessage>({
      api: "/api/ai/generate",
      prepareSendMessagesRequest: ({ body, api }) => {
        const { route, ...rest } = (body ?? {}) as { route?: string };
        return { api: route ?? api, body: rest };
      },
    }),
    [],
  );

  // Put a page on the canvas without autosaving it (the server saved it).
  const show = useCallback((page: PageData) => {
    onSaved(page);
    dispatch({ type: "setData", data: { root: page.root, content: page.content } as Partial<Data> });
  }, [dispatch, onSaved]);

  const patchLast = useCallback((patch: Partial<Turn>) => {
    setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, ...patch } : turn)));
  }, []);

  const end = useCallback((patch: Partial<Turn>) => {
    if (finished.current) return;
    finished.current = true;
    patchLast(patch);
    onRunning(null);
  }, [onRunning, patchLast]);

  // After an edit or Prettify: the newest change can be undone; an edit's changed section flashes, and the
  // selection follows its section (an edit can add one above it).
  const settle = useCallback((turn: Turn, result: Extract<RunResult, { ok: true }>) => {
    if (turn.kind === "generate") return;
    if (result.runId) setUndoRun({ runId: result.runId, kind: turn.kind });
    if (turn.kind !== "edit") return;
    if (turn.selectedId) {
      const index = result.page.content.findIndex((s) => s.props.id === turn.selectedId);
      dispatch({ type: "setUi", ui: { itemSelector: index < 0 ? null : { index, zone: ROOT_ZONE } } });
    }
    const id = before.current && changedSection(before.current, result.page);
    if (id) flashSection(id);
  }, [dispatch, setUndoRun]);

  // The run ended without its result: ask the server how it ended. Only a run that succeeded was saved (and
  // counted); one still going is asked again until it ends. Without a run id the run never started.
  const reconcile = useCallback(async () => {
    if (finished.current || reconciling.current) return;
    reconciling.current = true;
    const id = runId.current;
    try {
      let state = await getSiteState(siteId, id);
      for (let i = 0; id && state.status === "running" && i < 50; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        state = await getSiteState(siteId, id);
      }
      setUsage(state.usage);
      if (id && state.status === "succeeded") {
        const result: RunResult = {
          ok: true, runId: id, page: state.draft, name: state.draft.root.props.title, sections: state.draft.content.length, reply: "", usage: state.usage,
        };
        show(state.draft);
        const turn = current.current;
        end({ result });
        if (turn) settle(turn, result);
        return;
      }
      show(state.draft);
    } catch {
      if (before.current) show(before.current);
    }
    end({ failed: true });
  }, [end, settle, siteId, show]);

  const { messages, sendMessage } = useChat<SiteUIMessage>({
    transport,
    onData: (part) => {
      const turn = current.current;
      if (part.type === "data-run") {
        runId.current = part.data.runId;
      } else if (part.type === "data-page") {
        const known = new Set(getPuck().appState.data.content.map((c) => c.props.id as string));
        const added = part.data.content.find((s) => !known.has(s.props.id));
        show(part.data);
        if (added && turn?.kind === "generate") revealSection(added.props.id);
      } else if (part.type === "data-changes") {
        patchLast({ changes: part.data });
      } else if (part.type === "data-result") {
        const result = part.data;
        if (result.usage) setUsage(result.usage);
        if (result.ok) show(result.page);
        else if (before.current) show(before.current);
        const wasOpen = !finished.current;
        end({ result, failed: !result.ok });
        if (wasOpen && result.ok && turn) settle(turn, result);
      }
    },
    onError: (error) => {
      const code = codeOf(error);
      // Not a guard's answer: the stream broke, so the server may already have saved the run.
      if (code === "model_error") {
        void reconcile();
        return;
      }
      if (before.current) show(before.current);
      if (code === "ai_limit" || code === "empty_page") {
        toast.show(code === "ai_limit" ? `You’ve used all ${usage.allowance} AI requests this month` : EMPTY_PAGE);
        finished.current = true;
        setTurns((t) => t.slice(0, -1));
        onRunning(null);
        return;
      }
      end(GUARD_COPY[code] ? { code } : { failed: true });
    },
    onFinish: () => {
      // The stream ended without a result (a dropped connection): read what the server has.
      if (!finished.current) void reconcile();
    },
  });

  const start = useCallback(async (turn: Omit<Turn, "from">) => {
    if (!finished.current) return;
    if (usage.left <= 0) {
      toast.show(`You’ve used all ${usage.allowance} AI requests this month`);
      return;
    }
    finished.current = false;
    reconciling.current = false;
    runId.current = null;
    // The run starts from the server's draft, so the page on screen has to be saved first.
    if (!(await beforeRun())) {
      finished.current = true;
      toast.show("Couldn't save. Retrying…");
      return;
    }
    before.current = structuredClone(getPuck().appState.data) as unknown as PageData;
    if (turn.kind === "generate") dispatch({ type: "setUi", ui: { itemSelector: null } });
    const next: Turn = { ...turn, from: messages.length };
    current.current = next;
    setTurns((t) => [...t, next]);
    onRunning(turn.kind);
    const body =
      turn.kind === "generate" ? { siteId, prompt: turn.prompt, ...turn.brief }
      : turn.kind === "edit" ? { siteId, prompt: turn.prompt, selectedId: turn.selectedId ?? null }
      : { siteId };
    void sendMessage({ text: turn.prompt }, { body: { ...body, route: `/api/ai/${turn.kind}` } });
  }, [beforeRun, dispatch, getPuck, messages.length, onRunning, sendMessage, siteId, toast, usage]);

  // Prettify, from the top bar or a message that starts with "Prettify".
  const prettify = useCallback(() => {
    if (!finished.current) return;
    if (getPuck().appState.data.content.length === 0) {
      toast.show(EMPTY_PAGE);
      onTab("add");
      return;
    }
    if (usage.left <= 0) {
      toast.show(`You’ve used all ${usage.allowance} AI requests this month`);
      return;
    }
    onTab("ai");
    void start({ kind: "prettify", prompt: "Prettify" });
  }, [getPuck, onTab, start, toast, usage]);

  useEffect(() => {
    actionsRef.current = { prettify };
  }, [actionsRef, prettify]);

  // A message (or a chip) asks for a change to the page, scoped to the selected section if there is one.
  const ask = useCallback((message: string) => {
    if (/^prettify\b/i.test(message)) return prettify();
    void start({ kind: "edit", prompt: message, selectedId });
  }, [prettify, selectedId, start]);

  // A build waiting from /new starts as soon as the editor opens; a blank start with nothing waiting shows the
  // blank-start message instead.
  const pendingChecked = useRef(false);
  useEffect(() => {
    if (pendingChecked.current) return;
    pendingChecked.current = true;
    const key = pendingBuildKey(siteId);
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      if (blankStart) setTimeout(() => setShowBlank(true), 0);
      return;
    }
    sessionStorage.removeItem(key);
    let p: PendingBuild;
    try {
      p = JSON.parse(raw) as PendingBuild;
    } catch {
      return; // a broken entry: nothing to build
    }
    setTimeout(() => void start({ kind: "generate", prompt: p.prompt, brief: { name: p.name || null, tone: p.tone, useCase: p.useCase } }), 0);
  }, [blankStart, siteId, start]);

  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, turns]);

  const send = () => {
    const prompt = text.trim();
    if (!prompt || running) return;
    setText("");
    ask(prompt);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    send();
  };
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const undo = async (run: UndoRun) => {
    if (running) return;
    try {
      const page = await undoAiChange(siteId, run.runId);
      show(page);
      setUndoRun(null);
      track("ai_change_undone", { site_id: siteId, kind: run.kind });
    } catch (err) {
      console.error("undo failed", err);
    }
  };

  const themeName = THEME_META[theme ?? "paper"]?.name ?? "Paper";

  // The Undo button (only on the newest AI change) and the suggestion chips after each AI reply.
  const after = (result: Extract<RunResult, { ok: true }>, kind: RunKind) => (
    <>
      {kind !== "generate" && undoRun && undoRun.runId === result.runId && (
        <div>
          <button type="button" className="undo-ai" disabled={running} onClick={() => void undo(undoRun)}>
            <Undo2 />{kind === "prettify" ? "Undo Prettify" : "Undo AI change"}
          </button>
        </div>
      )}
      <div className="chips">
        {CHIPS.map((c) => <button key={c} type="button" className="chip" disabled={running} onClick={() => ask(c)}>{c}</button>)}
      </div>
    </>
  );

  return (
    <>
      <div className="chat-body" id="edLog" role="log" aria-live="polite" ref={log}>
        {showBlank && (
          <div className="msg ai">
            <Who />
            <div>
              You’re starting from a blank page. Add sections from the Add tab and type your own words in the fields on the right.
              <br /><br />
              When it looks right, press <b>Prettify</b> and I’ll style it: theme, fonts, layouts, spacing and photos. I won’t change a word.
              <div className="chips">
                <button type="button" className="chip" onClick={() => onTab("add")}>Open the Add tab</button>
              </div>
            </div>
          </div>
        )}
        {turns.map((turn, i) => {
          const message = messages.slice(turn.from, turns[i + 1]?.from).find((m) => m.role === "assistant");
          const ok = turn.result?.ok ? turn.result : null;
          const pending = !turn.result && !turn.failed && !turn.code;
          return (
            <div key={i} style={{ display: "contents" }}>
              <div className="msg me">{turn.prompt}</div>
              {turn.code ? (
                <div className="msg ai"><Who /><div>{GUARD_COPY[turn.code]}</div></div>
              ) : turn.kind === "generate" ? (
                <>
                  <div className="msg ai"><Who /><div>On it. This takes a few seconds.<Steps rows={buildRows(message, turn, themeName)} /></div></div>
                  {ok && (
                    <div className="msg ai">
                      <Who />
                      <div>
                        Built <b>{ok.name}</b> with {ok.sections} sections. Click any section to edit it, ask me for changes, or press Prettify to try another look.
                        {after(ok, turn.kind)}
                      </div>
                    </div>
                  )}
                  {turn.failed && (
                    <div className="msg ai">
                      <Who />
                      <div>
                        {BUILD_FAILED}
                        <div className="chips">
                          <button type="button" className="chip" disabled={running} onClick={() => void start({ kind: "generate", prompt: turn.prompt, brief: turn.brief })}>Try again</button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : turn.kind === "edit" ? (
                <>
                  {pending && (
                    <div className="msg ai"><Who /><div><Steps rows={[{ label: "Updating your page", state: "run" }]} /></div></div>
                  )}
                  {ok && <div className="msg ai"><Who /><div>{ok.reply}{after(ok, turn.kind)}</div></div>}
                  {turn.failed && <div className="msg ai"><Who /><div>{EDIT_FAILED}</div></div>}
                </>
              ) : (
                <>
                  <div className="msg ai"><Who /><div>Restyling your page. Your words stay exactly as they are.<Steps rows={prettifyRows(message, turn)} /></div></div>
                  {ok && (
                    <div className="msg ai">
                      <Who />
                      <div>
                        Done. Here’s what changed:
                        <ul className="chg">
                          {(turn.changes ?? []).map(([k, v], j) => <li key={j}><span>{k}</span><b>{v}</b></li>)}
                        </ul>
                        <div className="keep"><Check />Every word is exactly as you wrote it</div>
                        {after(ok, turn.kind)}
                      </div>
                    </div>
                  )}
                  {turn.failed && (
                    <div className="msg ai">
                      <Who />
                      <div>{turn.result && !turn.result.ok && turn.result.reason === "words_changed" ? PRETTIFY_REJECTED : EDIT_FAILED}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      {selectedId && selectedLabel && (
        <span className="sel-chip show" id="edSel">
          <span id="edSelTxt">Editing: {selectedLabel}</span>
          <button type="button" aria-label="Clear selection" id="edSelX" onClick={() => dispatch({ type: "setUi", ui: { itemSelector: null } })}>×</button>
        </span>
      )}
      <form className="composer" id="edComposer" onSubmit={submit}>
        <label htmlFor="edPrompt" style={{ position: "absolute", left: -9999 }}>Ask for a change</label>
        <textarea
          id="edPrompt"
          maxLength={1000}
          placeholder={selectedLabel ? `Ask for a change to the ${selectedLabel.toLowerCase()}…` : "Ask for a change…"}
          value={text}
          disabled={running}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="composer-row">
          <span className="meta" id="edReq">{usage.left} of {usage.allowance} AI requests left this month</span>
          <button className="send btn-blue" type="submit" aria-label="Send" disabled={running || !text.trim()}>
            <ArrowUp strokeWidth={1.8} style={{ margin: "auto", display: "block" }} />
          </button>
        </div>
      </form>
    </>
  );
}
