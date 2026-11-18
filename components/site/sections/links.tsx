import type { SectionProps } from "@/lib/site/types";
import { SafeLink } from "../safe-link";

export function Links({ items }: SectionProps<"Links">) {
  return (
    <section data-section="Links" className="px-6 py-16 @2xl:py-20">
      <div className="mx-auto flex max-w-md flex-col gap-3">
        {items.map((item, i) => (
          <SafeLink
            key={i}
            href={item.href}
            className={
              i === 0
                ? "flex h-14 items-center justify-center rounded-site bg-site-accent px-6 font-semibold text-site-accent-fg hover:opacity-90"
                : "flex h-14 items-center justify-center rounded-site border border-site-border bg-site-surface px-6 font-semibold hover:opacity-90"
            }
          >
            {item.label}
          </SafeLink>
        ))}
      </div>
    </section>
  );
}
