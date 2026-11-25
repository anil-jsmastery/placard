import { Link } from "@/lib/sections/schemas";

// <a> only for https://, http:// and mailto: links; anything else renders as a <span> with the same class.
export function SafeLink({ href, className, children }: { href?: string; className?: string; children: React.ReactNode }) {
  if (href && Link.safeParse(href).success) {
    const external = /^https?:/i.test(href);
    return (
      <a className={className} href={href} {...(external ? { target: "_blank", rel: "noopener" } : {})}>
        {children}
      </a>
    );
  }
  return <span className={className}>{children}</span>;
}

export function Arrow() {
  return <span className="pf-arrow" aria-hidden="true">↗</span>;
}
