import type { SectionProps } from "@/lib/site/types";
import { SiteImage } from "../site-image";

export function About({ props, anchor }: { props: SectionProps<"About">; anchor?: string }) {
  return (
    <section className="pf-sec pf-about" id={anchor}>
      <span className="pf-label">{props.heading}</span>
      <div>
        <p className="pf-body">{props.text}</p>
        {props.more && <p>{props.more}</p>}
        {props.image && <SiteImage image={props.image} />}
      </div>
    </section>
  );
}
