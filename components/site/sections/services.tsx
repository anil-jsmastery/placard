import type { SectionProps } from "@/lib/site/types";
import { HeadRow, two } from "./head-row";

export function Services({ props }: { props: SectionProps<"Services"> }) {
  const { items } = props;
  return (
    <section className="pf-sec">
      <HeadRow heading={props.heading} />
      <div className="pf-svc" data-cols={items.length >= 4 ? 4 : 3}>
        {items.map((it, i) => (
          <div key={i}>
            <span className="pf-label">{two(i + 1)}</span>
            <h3 className="pf-h pf-h3">{it.title}</h3>
            {it.text && <p>{it.text}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
