import type { PageData, SectionData } from "@/lib/site/types";
import { SiteFooter } from "./site-footer";
import { SiteNav } from "./site-nav";

type RootProps = PageData["root"]["props"];

// The one .site wrapper: site.css sets --pad and --gap on .site, and every section's padding and gap uses them.
// Published pages (SiteRoot) and the editor canvas (Puck's root.render) both use it; never write a second .site div.
// `sections` are the visible sections, for the navigation's links.
export function SiteShell({ root, sections = [], children }: { root: RootProps; sections?: SectionData[]; children: React.ReactNode }) {
  return (
    <div className="site" data-theme={root.theme} data-font={root.font} data-spacing={root.spacing}>
      <SiteNav title={root.title} availability={root.availability} sections={sections} />
      {children}
      <SiteFooter title={root.title} showBadge={root.showBadge} />
    </div>
  );
}
