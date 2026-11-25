import type { SectionProps } from "@/lib/site/types";
import { HeadRow } from "./head-row";

export function Experience({ props }: { props: SectionProps<"Experience"> }) {
  return (
    <section className="pf-sec pf-exp">
      <HeadRow heading={props.heading} />
      {props.items.map((it, i) => (
        <div key={i} className="pf-xrow">
          <span className="pf-label">{it.years}</span>
          <span><b>{it.role}</b>, {it.company}</span>
          <span>{it.note || ""}</span>
        </div>
      ))}
    </section>
  );
}
