import type { SectionProps } from "@/lib/site/types";
import { Arrow, SafeLink } from "../safe-link";
import { HeadRow } from "./head-row";

export function Writing({ props, anchor }: { props: SectionProps<"Writing">; anchor?: string }) {
  const { items } = props;
  return (
    <section className="pf-sec" id={anchor}>
      <HeadRow heading={props.heading} count={items.length} />
      <div className="pf-writing">
        {items.map((it, i) => (
          <SafeLink key={i} href={it.link} className="pf-wrow">
            <span className="pf-h pf-h3">{it.title}</span>
            <span className="pf-mute">{it.outlet}</span>
            <span className="pf-label">{it.year || ""}</span>
            {it.link ? <Arrow /> : <span />}
          </SafeLink>
        ))}
      </div>
    </section>
  );
}
