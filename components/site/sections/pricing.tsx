import { Check } from "lucide-react";
import type { SectionProps } from "@/lib/site/types";
import { SafeLink } from "../safe-link";

export function Pricing({ heading, plans }: SectionProps<"Pricing">) {
  return (
    <section data-section="Pricing" className="px-6 py-16 @2xl:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="max-w-2xl text-3xl font-bold @2xl:text-4xl">{heading}</h2>
        <div className="mt-10 grid items-start gap-6 @3xl:grid-cols-3">
          {plans.map((plan, i) => (
            <div
              key={i}
              className={
                plan.highlighted
                  ? "rounded-site border-2 border-site-accent bg-site-surface p-6"
                  : "rounded-site border border-site-border bg-site-surface p-6"
              }
            >
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-4">
                <span className="text-4xl font-bold tabular-nums">{plan.price}</span>
                {plan.period && <> <span className="text-site-muted">{plan.period}</span></>}
              </p>
              {plan.features.length > 0 && (
                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex gap-2">
                      <Check className="shrink-0 mt-0.5 size-4 text-site-accent" aria-hidden="true" />
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
              {plan.button && (
                <SafeLink
                  href={plan.button.href}
                  className={
                    plan.highlighted
                      ? "mt-8 flex h-11 items-center justify-center rounded-site bg-site-accent font-semibold text-site-accent-fg hover:opacity-90"
                      : "mt-8 flex h-11 items-center justify-center rounded-site border border-site-border font-semibold hover:opacity-90"
                  }
                >
                  {plan.button.label}
                </SafeLink>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
