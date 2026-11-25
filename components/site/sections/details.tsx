import type { SectionProps } from "@/lib/site/types";
import { SafeLink } from "../safe-link";

export function Details({ props }: { props: SectionProps<"Details"> }) {
  const { items } = props;
  return (
    <section className="pf-sec">
      <div className="pf-details" data-count={items.length === 3 ? 3 : 4}>
        {items.map((d, i) => (
          <div key={i}>
            <span className="pf-label">{d.label}</span>
            <SafeLink href={d.link}>{d.value}</SafeLink>
          </div>
        ))}
      </div>
    </section>
  );
}
