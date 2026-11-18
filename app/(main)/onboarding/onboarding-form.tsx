"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { Calendar, Package, Palette, Shapes, Store, type LucideIcon } from "lucide-react";
import { track } from "@/lib/analytics/client";
import type { UseCase } from "@/lib/analytics/events";
import { saveUseCase } from "./actions";

const OPTIONS: { value: UseCase; label: string; text: string; icon: LucideIcon; wide?: boolean }[] = [
  { value: "business", label: "Business", text: "A shop, café, studio or service", icon: Store },
  { value: "portfolio", label: "Portfolio", text: "Your work and how to hire you", icon: Palette },
  { value: "event", label: "Event", text: "A meetup, wedding or launch", icon: Calendar },
  { value: "product", label: "Product", text: "An app, a gadget or something you sell", icon: Package },
  { value: "other", label: "Something else", text: "A club, a cause, a link page or anything else", icon: Shapes, wide: true },
];

export function OnboardingForm() {
  const router = useRouter();
  const [useCase, setUseCase] = useState<UseCase | null>(null);
  const [pending, startTransition] = useTransition();

  function finish(value: UseCase, skipped: boolean) {
    startTransition(async () => {
      await saveUseCase(value);
      track("onboarding_completed", { use_case: value, skipped });
      posthog.setPersonProperties({ use_case: value });
      router.push("/new");
    });
  }

  return (
    <form
      className="w-full max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        if (useCase) finish(useCase, false);
      }}
    >
      <h1 className="font-display text-4xl font-bold sm:text-5xl">What are you building?</h1>
      <p className="mt-3 text-muted-foreground">We’ll show you example prompts that fit.</p>
      <fieldset className="mt-8">
        <legend className="sr-only">Use case</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {OPTIONS.map(({ value, label, text, icon: Icon, wide }) => {
            const selected = useCase === value;
            return (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3.5 rounded-xl border-2 bg-card p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring ${selected ? "border-primary" : "border-border hover:border-input"}${wide ? " sm:col-span-2" : ""}`}
              >
                <input
                  type="radio"
                  name="use_case"
                  value={value}
                  className="sr-only"
                  checked={selected}
                  onChange={() => setUseCase(value)}
                />
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-lg ${selected ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-semibold">{label}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{text}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={!useCase || pending}
          className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40 sm:w-auto"
        >
          Continue
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => finish("other", true)}
          className="inline-flex h-11 items-center justify-center rounded-md px-4 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          Skip for now
        </button>
      </div>
    </form>
  );
}
