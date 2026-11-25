import { Fragment } from "react";
import type { SectionType } from "@/lib/sections/schemas";
import type { PageData, SectionData } from "@/lib/site/types";
import { NAV_LINK } from "./anchors";
import { SECTION_COMPONENTS } from "./sections";
import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";

function renderSection(s: SectionData, anchor?: string) {
  const Component = SECTION_COMPONENTS[s.type] as React.ComponentType<{ props: SectionData["props"]; anchor?: string }>;
  return <Component key={s.props.id} props={s.props} anchor={anchor} />;
}

// A whole portfolio: <div class="site"> with the navigation, the visible sections and the footer.
// `wrap` puts something around each section; only /dev/sections uses it (the section labels).
export function SiteRoot({ page, wrap }: { page: PageData; wrap?: (type: SectionType, node: React.ReactNode) => React.ReactNode }) {
  const r = page.root.props;
  const sections = page.content.filter((s) => !s.props.hidden);
  const used = new Set<string>();
  return (
    <div className="site" data-theme={r.theme} data-font={r.font} data-spacing={r.spacing}>
      <SiteNav title={r.title} availability={r.availability} sections={sections} />
      {sections.map((s) => {
        // The first section of each kind gets the id the navigation points at.
        const anchor = NAV_LINK[s.type]?.anchor;
        const id = anchor && !used.has(anchor) ? (used.add(anchor), anchor) : undefined;
        const node = renderSection(s, id);
        return wrap ? <Fragment key={s.props.id}>{wrap(s.type, node)}</Fragment> : node;
      })}
      <SiteFooter title={r.title} showBadge={r.showBadge} />
    </div>
  );
}
