import { Link } from "@/lib/sections/schemas";

type SafeLinkProps = {
  href: string | undefined;
  className?: string;
  children: React.ReactNode;
};

/**
 * Every link in a site goes through here. It renders an <a> only for https://, http://,
 * mailto: and tel: links (opening http(s) in a new tab); otherwise it keeps the look
 * but renders no link.
 */
export function SafeLink({ href, className, children }: SafeLinkProps) {
  const ok = href !== undefined && Link.safeParse(href).success;
  if (!ok) return <span className={className}>{children}</span>;
  const external = /^https?:\/\//i.test(href.trim());
  return (
    <a
      href={href.trim()}
      className={className}
      {...(external ? { target: "_blank", rel: "noopener" } : {})}
    >
      {children}
    </a>
  );
}
