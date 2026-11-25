"use client";

import { useState, useTransition } from "react";
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

  const go = (useCase: Kind | "other", skipped: boolean) =>
    start(async () => {
      await saveUseCase(useCase);
      track("onboarding_completed", { use_case: useCase, skipped });
      posthog.setPersonProperties({ use_case: useCase });
      router.push("/new");
    });

  return (
    <>
      <div className="kgrid" role="radiogroup" aria-label="Kind of site" id="kgrid">
        {KINDS.map((k) => {
          const Icon = KIND_ICONS[k.key];
          const wide = "wide" in k && k.wide;
          return (
            <button
              key={k.key}
              type="button"
              className={wide ? "kcard wide" : "kcard"}
              role="radio"
              aria-checked={kind === k.key}
              onClick={() => setKind(k.key)}
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
