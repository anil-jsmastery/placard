import type { SectionProps } from "@/lib/site/types";
import { HeadRow } from "./head-row";

export function Testimonials({ props }: { props: SectionProps<"Testimonials"> }) {
  const { items } = props;
  return (
    <section className="pf-sec">
      <HeadRow heading={props.heading} />
      <div className="pf-quotes" data-count={Math.min(3, items.length)}>
        {items.map((q, i) => (
          <figure key={i} className="pf-quote">
            <blockquote>{q.quote}</blockquote>
            <figcaption>
              {q.name}
              {q.role && <span>, {q.role}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
