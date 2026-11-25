import type { SectionProps } from "@/lib/site/types";
import { SafeLink } from "../safe-link";
import { Placeholder, SiteImage } from "../site-image";
import { HeadRow, two } from "./head-row";

export function Work({ props, anchor }: { props: SectionProps<"Work">; anchor?: string }) {
  const { heading, items } = props;
  return (
    <section className="pf-sec pf-work" id={anchor}>
      <HeadRow heading={heading} count={items.length} />
      {props.layout === "list" ? (
        <div className="pf-work-list">
          {items.map((it, i) => (
            <SafeLink key={i} href={it.link} className="pf-row">
              <span className="pf-label">{two(i + 1)}</span>
              <span className="pf-h">{it.title}</span>
              <span className="pf-cat">{it.tags[0] || it.year || ""}</span>
              {it.image ? <SiteImage image={it.image} className="pf-thumb" /> : <span />}
            </SafeLink>
          ))}
        </div>
      ) : (
        <div className="pf-work-grid">
          {items.map((it, i) => (
            <article key={i} className="pf-card">
              <SafeLink href={it.link}>
                {it.image ? <SiteImage image={it.image} /> : <Placeholder />}
                <div className="pf-card-top">
                  <h3 className="pf-h pf-h3">{it.title}</h3>
                  {it.year && <span className="pf-label">{it.year}</span>}
                </div>
              </SafeLink>
              {it.summary && <p>{it.summary}</p>}
              {it.tags.length > 0 && (
                <div className="pf-tags">
                  {it.tags.map((t, j) => <span key={j} className="pf-tag">{t}</span>)}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
