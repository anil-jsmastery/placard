import Link from "next/link";
import { APP_NAME } from "@/lib/config";

export function LogoMark({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className}>
      <rect x="3" y="3" width="10" height="2.2" rx="1.1" fill="#ffd43b" />
      <rect x="3" y="6.9" width="7.5" height="2.2" rx="1.1" fill="#fff" />
      <rect x="3" y="10.8" width="4.8" height="2.2" rx="1.1" fill="#fff" fillOpacity=".55" />
    </svg>
  );
}

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="flex h-10 shrink-0 items-center gap-2 rounded-md font-display text-[17px] font-bold tracking-tight text-foreground focus-visible:outline-2 focus-visible:outline-offset-4"
      aria-label={`${APP_NAME} home`}
    >
      <span className="grid size-7 place-items-center rounded-md bg-primary" aria-hidden="true">
        <LogoMark />
      </span>
      <span>{APP_NAME}</span>
    </Link>
  );
}
