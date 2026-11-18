import type { SectionProps } from "@/lib/site/types";

export function Services({ heading, items }: SectionProps<"Services">) {
  return (
    <section data-section="Services" className="px-6 py-16 @2xl:py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="max-w-2xl text-3xl font-bold @2xl:text-4xl">{heading}</h2>
        <div className="mt-10 divide-y divide-site-border border-y border-site-border">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col gap-1 py-6 @2xl:flex-row @2xl:items-baseline @2xl:gap-8">
              <h3 className="text-xl font-semibold @2xl:w-64 @2xl:shrink-0">{item.title}</h3>
              {item.text && <p className="leading-relaxed text-site-muted">{item.text}</p>}
              {item.price && <p className="font-semibold tabular-nums @2xl:ml-auto @2xl:pl-6">{item.price}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
