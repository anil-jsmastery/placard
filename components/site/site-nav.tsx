import type { SectionData } from "@/lib/site/types";
import { NAV_LINK } from "./anchors";

export function SiteNav({ title, availability, sections }: { title: string; availability?: string; sections: SectionData[] }) {
  const links = [...new Map(
    sections.flatMap((s) => (NAV_LINK[s.type] ? [NAV_LINK[s.type]!] : [])).map((l) => [l.label, l] as const),
  ).values()].slice(0, 3);
  return (
    <nav className="pf-nav">
      <span className="pf-name">{title}</span>
      {links.length > 0 && (
        <span className="pf-links">
          {links.map((l) => <a key={l.label} href={`#${l.anchor}`}>{l.label}</a>)}
        </span>
      )}
      {availability && (
        <span className="pf-avail"><span className="pf-dot" />{availability}</span>
      )}
    </nav>
  );
}
