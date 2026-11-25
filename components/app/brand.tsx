import Link from "next/link";

export function BrandMark({ style }: { style?: React.CSSProperties }) {
  return (
    <span className="mark" style={style}>
      <svg viewBox="0 0 20 20" fill="none">
        <rect x="3" y="2.5" width="14" height="15" rx="3.5" fill="#17171C" />
        <rect x="6" y="6" width="8" height="2.2" rx="1.1" fill="#fff" />
        <rect x="6" y="10" width="5" height="2.2" rx="1.1" fill="#8E9BFF" />
      </svg>
    </span>
  );
}

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href} aria-label="Placard home">
      <BrandMark />
      Placard
    </Link>
  );
}
