"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { ChevronLeft, LayoutGrid, Sparkles } from "lucide-react";
import { createSite } from "@/app/(main)/(app)/sites/actions";
import { useToast } from "@/components/app/toast";
import { KIND_ICONS } from "@/components/onboarding/kind-cards";
import { track } from "@/lib/analytics/client";
import { EXAMPLE_PROMPTS, KINDS, type Kind } from "@/lib/site/sample-pages";

const TONES = ["Minimal", "Bold", "Playful", "Elegant"] as const;
export type Tone = (typeof TONES)[number];
export type PendingBuild = { prompt: string; name: string; tone: Tone | null; useCase: Kind | "other" };
export const pendingBuildKey = (siteId: string) => `pending-build:${siteId}`;

const MAX = 1000;
const MIN = 10;
const fmt = (n: number) => n.toLocaleString("en-US");
const label = (k: Kind) => KINDS.find((x) => x.key === k)!.label;

// "December 1": when this month's AI requests come back (the 1st of next month, UTC).
function resetDate() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return next.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
}

// The prototype's .ds: the prompt box, name and tone, and the example prompts for what they do.
export function DescribeForm({
  useCase, left, allowance, sites, proRequests,
}: {
  useCase: Kind | "other";
  left: number;
  allowance: number;
  sites: { count: number; limit: number };
  proRequests: number;
}) {
  const [prompt, setPrompt] = useState("");
  const [name, setName] = useState("");
  const [tone, setTone] = useState<Tone | null>(null);
  const [usedExample, setUsedExample] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();
  const created = useRef<string | null>(null); // the portfolio made by an earlier try, so a retry doesn't make another

  // Experiment prompt-examples (Step 12): `blank` hides "Try an example"; control or no flag shows it.
  useEffect(() => posthog.onFeatureFlags(() => setShowExamples(posthog.getFeatureFlag("prompt-examples") !== "blank")), []);

  const kind = useCase === "other" ? null : useCase;
  const examples: [Kind, string][] = kind
    ? EXAMPLE_PROMPTS[kind].map((p) => [kind, p])
    : (["designer", "photographer", "developer"] as const).map((k) => [k, EXAMPLE_PROMPTS[k][0]]);
  const noRequests = left <= 0;
  const full = sites.count >= sites.limit;
  const ready = prompt.trim().length >= MIN && !busy;

  async function build() {
    const text = prompt.trim();
    if (text.length < MIN || busy) return;
    // Step 8 opens the paywall here; until then its title as a toast.
    if (noRequests) {
      toast.show(`You’ve used all ${allowance} AI requests this month`);
      return;
    }
    setBusy(true);
    track("prompt_submitted", { use_case: useCase, used_example: usedExample, prompt_length: text.length, blank: false });
    try {
      created.current ??= (await createSite({ name: name.trim() || undefined })).id;
      const id = created.current;
      const pending: PendingBuild = { prompt: text, name: name.trim(), tone, useCase };
      sessionStorage.setItem(pendingBuildKey(id), JSON.stringify(pending));
      router.push(`/sites/${id}/edit`);
    } catch {
      toast.show("Something went wrong building your portfolio. Try again (this request wasn't counted).");
      setBusy(false);
    }
  }

  // A blank page: no AI request, the editor's Add tab and Prettify do the rest.
  async function startBlank() {
    if (busy) return;
    // Step 8 opens the paywall (site_limit) here; until then its title as a toast.
    if (full) {
      toast.show("You’re using your 1 free portfolio");
      return;
    }
    setBusy(true);
    track("prompt_submitted", { use_case: useCase, used_example: false, prompt_length: 0, blank: true });
    try {
      const { id } = await createSite({ name: name.trim() || undefined });
      router.push(`/sites/${id}/edit`);
    } catch {
      toast.show("Something went wrong. Try again.");
      setBusy(false);
    }
  }

  return (
    <div className="ds">
      <Link className="back" href="/start">
        <ChevronLeft strokeWidth={1.7} />
        {kind ? (
          <span>Building a <b>{label(kind).toLowerCase().replace("illustrator or artist", "illustrator")}</b> portfolio</span>
        ) : (
          <span>Choose what you <b>do</b></span>
        )}
      </Link>
      <h1>Describe your portfolio</h1>
      <p className="sub">A sentence or two is enough. Say what you do, where you&apos;re based and the work you want to show.</p>

      <div className="shell ds-box">
        <div className="shell-body">
          <label htmlFor="dsText" className="sr" style={{ position: "absolute", left: -9999 }}>Describe your portfolio</label>
          <textarea
            id="dsText"
            maxLength={MAX}
            placeholder="A brand designer in Lisbon who makes identities for restaurants and small hotels. Five projects and a way to book a call."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div className="ds-row">
            <div className="meta">
              <b>{fmt(prompt.length)}</b> / 1,000<br />
              <span>{noRequests ? "No AI requests left this month" : `Uses 1 of your ${left} AI requests`}</span>
            </div>
            <button type="button" className="btn btn-blue" id="dsBuild" disabled={!ready} onClick={build}>
              <Sparkles />Build my portfolio
            </button>
          </div>
        </div>
      </div>
      {noRequests ? (
        <div className="limit-note show">
          You’ve used all your AI requests this month. They reset on {resetDate()}, or <Link href="/pricing">upgrade to Pro</Link> for {proRequests} a month. You can still start from a blank page.
        </div>
      ) : full ? (
        <div className="limit-note show">
          You’re using {sites.count} of {sites.limit} portfolio{sites.limit > 1 ? "s" : ""}. You’ll need <Link href="/pricing">Pro</Link> to make another one.
        </div>
      ) : null}
      <button className="ds-blank" id="dsBlank" type="button" disabled={busy} onClick={startBlank}>
        <span className="em"><LayoutGrid /></span>
        <span>
          <b style={{ fontWeight: 500, color: "var(--ink)" }}>Start with a blank page</b><br />
          <span style={{ color: "var(--mute)", fontSize: 13.5 }}>Add sections yourself, type your own words, then press Prettify to style it.</span>
        </span>
        <span className="use">Start blank</span>
      </button>

      <div className="ds-fields">
        <div>
          <label htmlFor="dsName">Your name <span>(optional)</span></label>
          <input className="inp" id="dsName" maxLength={60} placeholder="As you'd like it on the page" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <span className="lbl" id="dsToneL">Tone <span>(optional)</span></span>
          <div className="seg" role="group" aria-labelledby="dsToneL" id="dsTones">
            {TONES.map((t) => (
              <button key={t} type="button" aria-pressed={tone === t} onClick={() => setTone(tone === t ? null : t)}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      {showExamples && (
        <div className="ds-ex">
          <h2>Try an example <span>{kind ? label(kind) : "A mix of ideas"}</span></h2>
          <div className="ex-list" id="dsExamples">
            {examples.map(([k, p]) => {
              const Icon = KIND_ICONS[k];
              return (
                <button
                  key={p}
                  type="button"
                  className="ex-btn"
                  onClick={() => {
                    setPrompt(p);
                    setUsedExample(true);
                    document.getElementById("dsText")?.focus();
                  }}
                >
                  <span className="em"><Icon /></span>
                  <span>{p}</span>
                  <span className="use">Use this</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
