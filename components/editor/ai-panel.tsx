"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useGetPuck, type Data } from "@puckeditor/core";
import { ArrowUp, Sparkle } from "lucide-react";
import { getSiteState } from "@/app/(main)/sites/[id]/edit/actions";
import { useToast } from "@/components/app/toast";
import { pendingBuildKey, type PendingBuild } from "@/components/new/describe-form";
import type { RunResult, SiteUIMessage } from "@/lib/ai/tools";
import { CATALOG } from "@/lib/sections/catalog";
import type { SectionType } from "@/lib/sections/schemas";
import { THEME_META } from "@/lib/site/themes";
import type { PageData } from "@/lib/site/types";
import { revealSection, usePuck } from "./puck";

export type Usage = { left: number; allowance: number };
type Brief = { name: string | null; tone: string | null; useCase: string };
type Turn = { prompt: string; brief: Brief; from: number; code?: string; result?: RunResult; failed?: boolean };
type Row = { label: string; state: "" | "run" | "ok" };
type ToolPart = { type: string; state?: string; input?: { type?: SectionType }; output?: { ok?: boolean } };

// The copy for each guard code (design-system §7). ai_limit is a toast until Step 8's paywall.
const GUARD_COPY: Record<string, string> = {
  ai_disabled: "AI is paused for a few minutes. You can still edit your portfolio by hand.",
  busy: "The AI is still working on your last request.",
  rate_limited: "That's a lot of requests in an hour. Try again in a few minutes.",
};
const BUILD_FAILED = "Something went wrong building your portfolio. Try again (this request wasn't counted).";

function codeOf(error: Error): string {
  try {
    const body = JSON.parse(error.message) as { code?: unknown };
    return typeof body.code === "string" ? body.code : "model_error";
  } catch {
    return "model_error";
  }
}

// The build log rows, from the run's real tool calls.
function buildRows(message: SiteUIMessage | undefined, turn: Turn, themeName: string): Row[] {
  const parts = (message?.parts ?? []) as ToolPart[];
  const tools = parts.filter((p) => p.type.startsWith("tool-"));
  const done = (p: ToolPart) => p.state === "output-available" && p.output?.ok === true;
  const ended = !!turn.result || turn.failed;
  const ok = turn.result?.ok === true;

  const reading = tools.length > 0 || ok;
  const themed = ok || tools.some((p) => p.type === "tool-setSiteSettings" && done(p));
  const added = tools.filter((p) => p.type === "tool-addSection" && done(p));
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

// The same page in any key order (jsonb doesn't keep the order it was given).
function samePage(a: PageData, b: PageData) {
  const sort = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(sort)
    : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort((v as Record<string, unknown>)[k])]))
    : v;
  return JSON.stringify(sort({ root: a.root, content: a.content })) === JSON.stringify(sort({ root: b.root, content: b.content }));
}

function Who() {
  return <div className="who"><i><Sparkle fill="#fff" strokeWidth={0} /></i>Placard</div>;
}

// The AI tab: the chat log with the live build, the composer and the usage line.
export function AiPanel({
  siteId, useCase, usage: initialUsage, running, onRunning, beforeRun, onSaved,
}: {
  siteId: string;
  useCase: string;
  usage: Usage;
  running: boolean;
  onRunning: (running: boolean) => void;
  beforeRun: () => Promise<boolean>;
  onSaved: (page: PageData) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState("");
  const [usage, setUsage] = useState(initialUsage);
  const sectionCount = usePuck((s) => s.appState.data.content.length);
  const theme = usePuck((s) => s.appState.data.root.props?.theme as keyof typeof THEME_META | undefined);
  const dispatch = usePuck((s) => s.dispatch);
  const getPuck = useGetPuck();
  const toast = useToast();
  const before = useRef<PageData | null>(null);
  const finished = useRef(true);
  const reconciling = useRef(false);
  const log = useRef<HTMLDivElement>(null);

  const transport = useMemo(
    () => new DefaultChatTransport<SiteUIMessage>({ api: "/api/ai/generate", prepareSendMessagesRequest: ({ body }) => ({ body: body ?? {} }) }),
    [],
  );

  // Put a page on the canvas without autosaving it (the server saves the run's result).
  const show = useCallback((page: PageData) => {
    onSaved(page);
    dispatch({ type: "setData", data: { root: page.root, content: page.content } as Partial<Data> });
  }, [dispatch, onSaved]);

  const end = useCallback((patch: Partial<Turn>) => {
    if (finished.current) return;
    finished.current = true;
    setTurns((t) => t.map((turn, i) => (i === t.length - 1 ? { ...turn, ...patch } : turn)));
    onRunning(false);
  }, [onRunning]);

  // The run ended without its result: read what the server saved. A changed draft means the build was saved
  // (and counted); otherwise nothing was.
  const reconcile = useCallback(async () => {
    if (finished.current || reconciling.current) return;
    reconciling.current = true;
    try {
      const state = await getSiteState(siteId);
      setUsage(state.usage);
      const saved = !!before.current && !samePage(state.draft, before.current);
      show(state.draft);
      if (saved) {
        const name = state.draft.root.props.title;
        end({ result: { ok: true, page: state.draft, name, sections: state.draft.content.length, usage: state.usage } });
        return;
      }
    } catch {
      if (before.current) show(before.current);
    }
    end({ failed: true });
  }, [end, siteId, show]);

  const { messages, sendMessage } = useChat<SiteUIMessage>({
    transport,
    onData: (part) => {
      if (part.type === "data-page") {
        const known = new Set(getPuck().appState.data.content.map((c) => c.props.id as string));
        const added = part.data.content.find((s) => !known.has(s.props.id));
        show(part.data);
        if (added) revealSection(added.props.id);
      } else if (part.type === "data-result") {
        const result = part.data;
        if (result.usage) setUsage(result.usage);
        if (result.ok) show(result.page);
        else if (before.current) show(before.current);
        end({ result, failed: !result.ok });
      }
    },
    onError: (error) => {
      const code = codeOf(error);
      // Not a guard's answer: the stream broke, so the server may already have saved the build.
      if (code === "model_error") {
        void reconcile();
        return;
      }
      if (before.current) show(before.current);
      if (code === "ai_limit") {
        toast.show(`You’ve used all ${usage.allowance} AI requests this month`);
        finished.current = true;
        setTurns((t) => t.slice(0, -1));
        onRunning(false);
        return;
      }
      end(GUARD_COPY[code] ? { code } : { failed: true });
    },
    onFinish: () => {
      // The stream ended without a result (a dropped connection): the server didn't save anything.
      if (!finished.current) void reconcile();
    },
  });

  const start = useCallback(async (prompt: string, brief: Brief) => {
    if (!finished.current) return;
    if (usage.left <= 0) {
      toast.show(`You’ve used all ${usage.allowance} AI requests this month`);
      return;
    }
    finished.current = false;
    reconciling.current = false;
    // The run starts from the server's draft, so the page on screen has to be saved first.
    if (!(await beforeRun())) {
      finished.current = true;
      toast.show("Couldn't save. Retrying…");
      return;
    }
    before.current = structuredClone(getPuck().appState.data) as unknown as PageData;
    dispatch({ type: "setUi", ui: { itemSelector: null } });
    setTurns((t) => [...t, { prompt, brief, from: messages.length }]);
    onRunning(true);
    void sendMessage({ text: prompt }, { body: { siteId, prompt, ...brief } });
  }, [beforeRun, dispatch, getPuck, messages.length, onRunning, sendMessage, siteId, toast, usage]);

  // A build waiting from /new starts as soon as the editor opens.
  const pendingChecked = useRef(false);
  useEffect(() => {
    if (pendingChecked.current) return;
    pendingChecked.current = true;
    const key = pendingBuildKey(siteId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return;
    sessionStorage.removeItem(key);
    let p: PendingBuild;
    try {
      p = JSON.parse(raw) as PendingBuild;
    } catch {
      return; // a broken entry: nothing to build
    }
    setTimeout(() => void start(p.prompt, { name: p.name || null, tone: p.tone, useCase: p.useCase }), 0);
  }, [siteId, start]);

  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, turns]);

  // With no sections, the composer builds a portfolio; Step 5 makes it ask for changes.
  const generate = sectionCount === 0;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const prompt = text.trim();
    if (!prompt || running || !generate) return;
    setText("");
    void start(prompt, { name: null, tone: null, useCase });
  };
  const themeName = THEME_META[theme ?? "paper"]?.name ?? "Paper";

  return (
    <>
      <div className="chat-body" id="edLog" role="log" aria-live="polite" ref={log}>
        {turns.map((turn, i) => {
          const message = messages.slice(turn.from, turns[i + 1]?.from).find((m) => m.role === "assistant");
          const rows = buildRows(message, turn, themeName);
          return (
            <div key={i} style={{ display: "contents" }}>
              <div className="msg me">{turn.prompt}</div>
              {turn.code ? (
                <div className="msg ai"><Who /><div>{GUARD_COPY[turn.code]}</div></div>
              ) : (
                <div className="msg ai">
                  <Who />
                  <div>
                    On it. This takes a few seconds.
                    <ul className="steps">
                      {rows.map((r) => <li key={r.label.split(" · ")[0]} className={r.state || undefined}><span className="dot"></span>{r.label}</li>)}
                    </ul>
                  </div>
                </div>
              )}
              {turn.result?.ok && (
                <div className="msg ai">
                  <Who />
                  <div>
                    Built <b>{turn.result.name}</b> with {turn.result.sections} sections. Click any section to edit it, ask me for changes, or press Prettify to try another look.
                  </div>
                </div>
              )}
              {turn.failed && (
                <div className="msg ai">
                  <Who />
                  <div>
                    {BUILD_FAILED}
                    <div className="chips">
                      <button type="button" className="chip" disabled={running} onClick={() => void start(turn.prompt, turn.brief)}>Try again</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <form className="composer" id="edComposer" onSubmit={submit}>
        <label htmlFor="edPrompt" style={{ position: "absolute", left: -9999 }}>Ask for a change</label>
        <textarea
          id="edPrompt"
          maxLength={1000}
          placeholder={generate ? "Describe your portfolio and I'll build it" : "Ask for a change…"}
          value={text}
          disabled={running}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="composer-row">
          <span className="meta" id="edReq">{usage.left} of {usage.allowance} AI requests left this month</span>
          <button className="send btn-blue" type="submit" aria-label="Send" disabled={running || !generate || !text.trim()}>
            <ArrowUp strokeWidth={1.8} style={{ margin: "auto", display: "block" }} />
          </button>
        </div>
      </form>
    </>
  );
}
