import type { SectionProps } from "@/lib/site/types";
import { Arrow, SafeLink } from "../safe-link";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram", linkedin: "LinkedIn", x: "X", github: "GitHub", dribbble: "Dribbble",
  behance: "Behance", youtube: "YouTube", substack: "Substack", website: "Website",
};

export function Contact({ props, anchor }: { props: SectionProps<"Contact">; anchor?: string }) {
  const { heading, email, text, socials } = props;
  return (
    <section className="pf-sec pf-contact" id={anchor}>
      <span className="pf-label">{heading}</span>
      <div style={{ marginTop: 14 }}>
        <SafeLink href={`mailto:${email}`} className="pf-big">{email}</SafeLink>
      </div>
      {text && <p>{text}</p>}
      {socials.length > 0 && (
        <div className="pf-socials">
          {socials.map((s, i) => (
            <SafeLink key={i} href={s.url}>{SOCIAL_LABELS[s.platform] ?? s.platform} <Arrow /></SafeLink>
          ))}
        </div>
      )}
    </section>
  );
}
