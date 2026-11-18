import type { SectionProps } from "@/lib/site/types";
import { SiteImage } from "../site-image";

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => [...w][0]!.toUpperCase()).join("");

export function Testimonials({ heading, items }: SectionProps<"Testimonials">) {
  return (
    <section data-section="Testimonials" className="px-6 py-16 @2xl:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="max-w-2xl text-3xl font-bold @2xl:text-4xl">{heading}</h2>
        <div className="mt-10 grid gap-6 @3xl:grid-cols-3">
          {items.map((item, i) => (
            <figure key={i} className="flex flex-col rounded-site border border-site-border bg-site-surface p-6">
              <blockquote className="flex-1 text-lg leading-relaxed">“{item.quote}”</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                {item.avatar ? (
                  <SiteImage image={item.avatar} avatar />
                ) : (
                  <span className="grid size-10 place-items-center rounded-full bg-site-border text-sm font-semibold">{initials(item.name)}</span>
                )}
                <span>
                  <span className="block font-semibold">{item.name}</span>
                  {item.role && <span className="block text-sm text-site-muted">{item.role}</span>}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
