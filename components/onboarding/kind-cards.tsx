"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { BookOpen, Camera, Code, Palette, PenTool, type LucideIcon } from "lucide-react";
import { saveUseCase } from "@/app/(main)/start/actions";
import { track } from "@/lib/analytics/client";
import { EXAMPLE_PROMPTS, KINDS, type Kind } from "@/lib/site/sample-pages";

// The KINDS icons (lucide names) as components.
export const KIND_ICONS: Record<Kind, LucideIcon> = {
  designer: PenTool, developer: Code, photographer: Camera, artist: Palette, writer: BookOpen,
};

// The prototype's .kgrid of five .kcard radios, the .peek box, Continue and Skip for now.
export function KindCards({ initial }: { initial: Kind | null }) {
  const [kind, setKind] = useState<Kind | null>(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  const cards = useRef<(HTMLButtonElement | null)[]>([]);

  const go = (useCase: Kind | "other", skipped: boolean) =>
    start(async () => {
      try {
        await saveUseCase(useCase);
      } catch {
        return; // nothing was saved: the choice stays and Continue works again
      }
      track("onboarding_completed", { use_case: useCase, skipped });
      posthog.setPersonProperties({ use_case: useCase });
      router.push("/new");
    });

  return (
    <>
      <div className="kgrid" role="radiogroup" aria-label="Kind of site" id="kgrid">
        {KINDS.map((k, i) => {
          const Icon = KIND_ICONS[k.key];
          // One tab stop for the group (the chosen card, or the first); arrow keys move and choose.
          const focusable = kind ? kind === k.key : i === 0;
          const wide = "wide" in k && k.wide;
          return (
            <button
              key={k.key}
              type="button"
              className={wide ? "kcard wide" : "kcard"}
              role="radio"
              aria-checked={kind === k.key}
              tabIndex={focusable ? 0 : -1}
              ref={(el) => {
                cards.current[i] = el;
              }}
              onClick={() => setKind(k.key)}
              onKeyDown={(e) => {
                const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
                if (!step) return;
                e.preventDefault();
                const j = (i + step + KINDS.length) % KINDS.length;
                setKind(KINDS[j].key);
                cards.current[j]?.focus();
              }}
            >
              <span className="ki"><Icon strokeWidth={1.75} /></span>
              <span><b>{k.label}</b><span className="d">{k.desc}</span></span>
              <span className="radio"></span>
            </button>
          );
        })}
      </div>
      <div className="peek shell" id="peek" hidden={!kind}>
        <div className="shell-head">You&apos;ll see prompts like this one</div>
        <div className="shell-body" id="peekText">{kind ? `“${EXAMPLE_PROMPTS[kind][0]}”` : ""}</div>
      </div>
      <div className="ob-actions">
        <button type="button" className="btn btn-blue" id="obContinue" disabled={!kind || pending} onClick={() => kind && go(kind, false)}>
          Continue
        </button>
        <a
          className="link"
          href="/new"
          id="obSkip"
          onClick={(e) => {
            e.preventDefault();
            if (!pending) go("other", true);
          }}
        >
          Skip for now
        </a>
      </div>
    </>
  );
}
