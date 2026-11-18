import type { SectionProps } from "@/lib/site/types";
import { SiteImage } from "../site-image";

export function Gallery({ heading, images }: SectionProps<"Gallery">) {
  return (
    <section data-section="Gallery" className="px-6 py-16 @2xl:py-20">
      <div className="mx-auto max-w-5xl">
        {heading && <h2 className="max-w-2xl text-3xl font-bold @2xl:text-4xl">{heading}</h2>}
        <div className={heading ? "mt-10 grid grid-cols-2 gap-4 @5xl:grid-cols-3" : "grid grid-cols-2 gap-4 @5xl:grid-cols-3"}>
          {images.map((item, i) => (
            <figure key={i}>
              <SiteImage image={item.image} className="aspect-[4/3]" />
              {item.caption && <figcaption className="mt-2 text-sm text-site-muted">{item.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
