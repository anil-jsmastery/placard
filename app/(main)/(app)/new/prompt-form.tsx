"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFeatureFlagVariantKey } from "posthog-js/react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/client";
import type { UseCase } from "@/lib/analytics/events";
import { EXAMPLES } from "@/lib/examples";
import { usePaywall } from "@/components/billing/paywall-provider";
import { createSite } from "../sites/actions";

const TONES = ["Minimal", "Bold", "Playful", "Elegant"] as const;
type Tone = (typeof TONES)[number];

const MAX = 1000;
const MIN = 10;

export function PromptForm({ useCase, left, allowance }: { useCase: UseCase; left: number; allowance: number }) {
  const router = useRouter();
  const paywall = usePaywall();
  const [prompt, setPrompt] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [tone, setTone] = useState<Tone | null>(null);
  const [usedExample, setUsedExample] = useState(false);
  const [pending, startTransition] = useTransition();
  // prompt-examples experiment (Step 14): `blank` hides the examples; `control` or no flag shows them
  const examplesVariant = useFeatureFlagVariantKey("prompt-examples");
  const showExamples = examplesVariant !== "blank";

  const canSubmit = prompt.trim().length >= MIN && !pending;

  function submit() {
    if (!canSubmit) return;
    // With no requests left, Build opens the paywall instead of calling the server (design-system §7)
    if (left === 0) {
      paywall.open("ai_limit", { allowance });
      return;
    }
    startTransition(async () => {
      track("prompt_submitted", { use_case: useCase, used_example: usedExample, prompt_length: prompt.length });
      const name = businessName.trim();
      const result = await createSite(name ? { businessName: name } : undefined);
      if (result.code) {
        paywall.open(result.code, { allowance });
        return;
      }
      const { id } = result;
      try {
        sessionStorage.setItem(
          `pending-build:${id}`,
          JSON.stringify({ prompt, businessName: name || undefined, tone: tone ?? undefined, useCase }),
        );
      } catch {
        // storage blocked: the editor opens without a pending build
      }
      router.push(`/sites/${id}/edit`);
    });
  }

  return (
    <>
      <form
        className="mt-8"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="rounded-xl border border-input bg-card focus-within:ring-2 focus-within:ring-ring/30">
          <label htmlFor="prompt" className="sr-only">
            Describe your site
          </label>
          <textarea
            id="prompt"
            name="prompt"
            rows={5}
            maxLength={MAX}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="block w-full resize-none rounded-t-xl bg-transparent px-5 pt-4 text-lg leading-relaxed outline-none placeholder:text-muted-foreground"
            placeholder="A yoga studio in Pokhara with morning classes, teacher bios and a weekly schedule. Calm and natural."
          />
          <div className="flex items-end justify-between gap-4 px-5 pt-2 pb-4">
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <p className="tabular-nums" aria-live="polite">
                {prompt.length.toLocaleString("en-US")} / 1,000
              </p>
              <p>Uses 1 of your {left} AI requests</p>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" variant="ai" disabled={!canSubmit}>
                <Sparkles aria-hidden="true" />
                Build my site
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="business" className="text-sm font-medium">
              Business name <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <input
              id="business"
              name="businessName"
              maxLength={80}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm"
              placeholder="e.g. Lakeside Yoga"
            />
          </div>
          <div>
            <span id="tone-label" className="text-sm font-medium">
              Tone <span className="font-normal text-muted-foreground">(optional)</span>
            </span>
            <div
              className="mt-2 grid grid-cols-4 gap-1 rounded-lg bg-muted p-1 text-sm font-medium"
              role="radiogroup"
              aria-labelledby="tone-label"
            >
              {TONES.map((t) => {
                const checked = tone === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    onClick={() => setTone(checked ? null : t)}
                    className={`h-10 rounded-md sm:h-8 ${checked ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </form>

      {showExamples ? (
        <section className="mt-12" aria-labelledby="examples-h">
          <h2 id="examples-h" className="text-sm font-semibold">
            Try an example
          </h2>
          <div className="mt-3 grid gap-3">
            {EXAMPLES[useCase].map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setPrompt(example);
                  setUsedExample(true);
                }}
                className="rounded-xl border border-border bg-card p-4 text-left text-sm leading-relaxed hover:border-input"
              >
                {example}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
