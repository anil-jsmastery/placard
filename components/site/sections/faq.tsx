import { Plus } from "lucide-react";
import type { SectionProps } from "@/lib/site/types";

export function FAQ({ heading, items }: SectionProps<"FAQ">) {
  return (
    <section data-section="FAQ" className="px-6 py-16 @2xl:py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-bold @2xl:text-4xl">{heading}</h2>
        <div className="mt-8 divide-y divide-site-border border-y border-site-border">
          {items.map((item, i) => (
            <details key={i} className="group" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-lg font-semibold">
                {item.question}
                <Plus className="shrink-0 size-5 transition-transform group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p className="-mt-2 pb-5 leading-relaxed text-site-muted">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
