import Link from "next/link";
import { Brand } from "@/components/app/brand";

export function Nav() {
  return (
    <header className="nav" id="nav">
      <div className="wrap">
        <Brand />
        <nav className="nav-links" aria-label="Main">
          <Link href="/#examples">Examples</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/#faq">FAQ</Link>
        </nav>
        <div className="nav-cta">
          <Link className="btn btn-sm" href="/sign-in" style={{ color: "var(--ink-2)" }}>Log in</Link>
          <Link className="btn btn-sm btn-blue" href="/start">Start building</Link>
        </div>
      </div>
    </header>
  );
}
