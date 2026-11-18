import type { SectionProps } from "@/lib/site/types";
import { SiteImage } from "../site-image";

export function About({ heading, text, image }: SectionProps<"About">) {
  return (
    <section data-section="About" className="px-6 py-16 @2xl:py-20">
      <div className={image ? "mx-auto grid max-w-5xl items-center gap-12 @5xl:grid-cols-[5fr_6fr]" : "mx-auto max-w-5xl"}>
        {image && <SiteImage image={image} className="aspect-[4/3] @5xl:aspect-square" />}
        <div>
          <h2 className="text-3xl font-bold @2xl:text-4xl">{heading}</h2>
          <p className="mt-5 max-w-prose text-lg leading-relaxed text-site-muted">{text}</p>
        </div>
      </div>
    </section>
  );
}
