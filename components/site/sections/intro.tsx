import type { SectionProps } from "@/lib/site/types";
import { Arrow, SafeLink } from "../safe-link";
import { SiteImage } from "../site-image";

export function Intro({ props }: { props: SectionProps<"Intro"> }) {
  const { headline, intro, role, primaryButton, secondaryButton, image } = props;
  const split = props.layout === "split" && image;
  const hasButtons = primaryButton || secondaryButton;
  return (
    <section className="pf-sec pf-intro" data-layout={split ? "split" : "statement"}>
      <div>
        <h1>{headline}</h1>
        <div className="pf-under">
          {intro && <p>{intro}</p>}
          <div className="pf-meta">
            {role && <span className="pf-label">{role}</span>}
            {hasButtons && (
              <div className="pf-acts">
                {primaryButton && <SafeLink href={primaryButton.href} className="pf-btn">{primaryButton.label} <Arrow /></SafeLink>}
                {secondaryButton && <SafeLink href={secondaryButton.href} className="pf-link">{secondaryButton.label} <Arrow /></SafeLink>}
              </div>
            )}
          </div>
        </div>
      </div>
      {split && <SiteImage image={image} />}
    </section>
  );
}
