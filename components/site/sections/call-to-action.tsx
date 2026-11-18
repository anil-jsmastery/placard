import type { SectionProps } from "@/lib/site/types";
import { SafeLink } from "../safe-link";

export function CallToAction({ heading, text, button }: SectionProps<"CallToAction">) {
  return (
    <section data-section="CallToAction" className="px-6 py-12">
      <div className="mx-auto max-w-5xl rounded-site bg-site-accent px-8 py-14 text-site-accent-fg @2xl:px-14">
        <h2 className="max-w-xl text-3xl font-bold @2xl:text-4xl">{heading}</h2>
        {text && <p className="mt-4 max-w-xl text-lg leading-relaxed opacity-90">{text}</p>}
        <SafeLink
          href={button.href}
          className="mt-8 inline-flex h-11 items-center rounded-site bg-site-accent-fg px-5 font-semibold text-site-accent hover:opacity-90"
        >
          {button.label}
        </SafeLink>
      </div>
    </section>
  );
}
