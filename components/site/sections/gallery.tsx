import type { SectionProps } from "@/lib/site/types";
import { Placeholder, SiteImage } from "../site-image";
import { HeadRow } from "./head-row";

export function Gallery({ props, anchor }: { props: SectionProps<"Gallery">; anchor?: string }) {
  const { heading, images } = props;
  return (
    <section className="pf-sec" id={anchor}>
      {heading && <HeadRow heading={heading} count={images.length} />}
      <div className="pf-gal" data-layout={props.layout === "mosaic" ? "mosaic" : "grid"}>
        {images.map((g, i) => (
          <figure key={i}>
            {g.image ? <SiteImage image={g.image} /> : <Placeholder />}
            {g.caption && <figcaption className="pf-label">{g.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </section>
  );
}
