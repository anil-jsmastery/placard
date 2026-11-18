import type { PageData } from "@/lib/site/types";
import { SiteFooter } from "./site-footer";

type SiteRootProps = PageData["root"]["props"] & { children: React.ReactNode; className?: string };

/** The wrapper of every site: theme and heading font, the sections, then the footer. */
export function SiteRoot({ title, theme, font, showBadge, className, children }: SiteRootProps) {
  return (
    <div className={className ? `site ${className}` : "site"} data-site-theme={theme} data-site-font={font}>
      {children}
      <SiteFooter title={title} showBadge={showBadge} />
    </div>
  );
}
