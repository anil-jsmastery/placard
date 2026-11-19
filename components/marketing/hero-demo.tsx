"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { SiteFrame } from "@/components/site/site-frame";
import { cn } from "@/lib/utils";

const DESIGN_WIDTH = 1280;
const TYPE_MS = 28;
const AFTER_TYPING_MS = 400;
const STEP_MS = 950;
const READY_MS = 3800;

type HeroDemoProps = {
  prompt: string;
  log: readonly { doing: string; done: string }[];
  /** The demo page's sections, rendered on the server; `sections[i]` is added by log row `i + 1`. */
  sections: React.ReactNode[];
  theme: string;
  font: string;
};

/** Where the timeline is. The first render (and reduced motion) is the finished state. */
type DemoState = { typed: number; step: number; doing: boolean; ready: boolean };

/**
 * The landing page's looping demo (design-system §9): types the prompt, adds the sections one by one with the
 * marker outline, shows "Ready to publish", waits and starts again. It pauses while the stage is off screen.
 */
export function HeroDemo({ prompt, log, sections, theme, font }: HeroDemoProps) {
  const finished: DemoState = { typed: prompt.length, step: log.length, doing: false, ready: true };
  const [state, setState] = useState<DemoState>(finished);
  const [offset, setOffset] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const blockRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const stage = stageRef.current;
    if (!stage) return;

    let cancelled = false;
    let visible = false;
    let resume: (() => void) | null = null;
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && resume) {
        resume();
        resume = null;
      }
    });
    observer.observe(stage);

    // Each wait first holds while the stage is off screen, so the loop stops there and carries on where it was.
    const wait = async (ms: number) => {
      if (!visible) await new Promise<void>((r) => (resume = r));
      await new Promise((r) => setTimeout(r, ms));
      if (cancelled) throw new Error("stopped");
    };

    async function run() {
      for (;;) {
        setState({ typed: 0, step: -1, doing: false, ready: false });
        setOffset(0);
        for (let i = 1; i <= prompt.length; i++) {
          await wait(TYPE_MS);
          setState((s) => ({ ...s, typed: i }));
        }
        await wait(AFTER_TYPING_MS);
        for (let step = 0; step < log.length; step++) {
          setState((s) => ({ ...s, step, doing: true }));
          await wait(STEP_MS);
          setState((s) => ({ ...s, doing: false }));
        }
        setState((s) => ({ ...s, ready: true }));
        await wait(READY_MS);
      }
    }
    run().catch(() => {});

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [prompt, log]);

  // Scroll the frame so the section just added is in view.
  const { step, doing } = state;
  useLayoutEffect(() => {
    if (!doing || step < 1) return;
    const block = blockRefs.current[step - 1];
    const frame = frameRef.current;
    if (!block || !frame) return;
    const scale = frame.clientWidth / DESIGN_WIDTH;
    const over = (block.offsetTop + block.offsetHeight) * scale - frame.clientHeight;
    setOffset(over > 0 ? -over / scale : 0);
  }, [step, doing]);

  const typing = state.typed < prompt.length;

  return (
    <div
      ref={stageRef}
      className="mt-14 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-28px_rgb(22_24_29/0.35)]"
      aria-label="Demo: the AI builds a bakery website from one sentence"
      role="img"
    >
      <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 border-b border-border p-5 lg:border-r lg:border-b-0">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 shrink-0" aria-hidden="true" />
            AI
          </div>
          <div className="rounded-lg bg-muted px-3.5 py-3 text-sm leading-relaxed">
            <span>{prompt.slice(0, state.typed)}</span>
            <span
              className={cn("ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-foreground", typing && state.step < 0 ? "opacity-100" : "opacity-0")}
            />
          </div>
          <ol className="hidden space-y-2.5 text-sm lg:block" aria-live="off">
            {log.map((row, i) => {
              if (i > state.step) return null;
              const active = i === state.step && doing;
              return (
                <li key={row.done} className="flex items-center gap-2.5">
                  <span
                    className={
                      active
                        ? "grid size-5 place-items-center rounded-full bg-marker motion-safe:animate-marker-pulse"
                        : "grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"
                    }
                  >
                    <Check className={cn("size-3 shrink-0", active && "invisible")} aria-hidden="true" />
                  </span>
                  <span>{active ? row.doing : row.done}</span>
                </li>
              );
            })}
          </ol>
          <div
            className={cn(
              "mt-auto hidden items-center lg:flex justify-between gap-3 rounded-lg border border-border px-3.5 py-3 text-sm",
              !state.ready && "invisible",
            )}
          >
            <span className="font-medium">Ready to publish</span>
            <span className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">Publish</span>
          </div>
        </div>
        <div className="min-w-0 bg-canvas p-4 sm:p-6">
          <div ref={frameRef} className="h-[300px] overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-black/5 sm:h-[440px]">
            <SiteFrame width={DESIGN_WIDTH} interactive={false} className="h-full">
              <div
                className="site"
                data-site-theme={theme}
                data-site-font={font}
                style={{ marginTop: offset, transition: "margin-top 500ms ease" }}
              >
                {sections.map((section, i) => {
                  const shown = i + 1 <= state.step;
                  const building = i + 1 === state.step && doing;
                  return (
                    <div
                      key={i}
                      ref={(el) => {
                        blockRefs.current[i] = el;
                      }}
                      className={cn(!shown && "hidden", building && "motion-safe:animate-build-in outline-4 -outline-offset-4 outline-marker")}
                    >
                      {section}
                    </div>
                  );
                })}
              </div>
            </SiteFrame>
          </div>
        </div>
      </div>
    </div>
  );
}
