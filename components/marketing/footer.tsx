import Link from "next/link";
import { BrandMark } from "@/components/app/brand";

export function Footer() {
  return (
    <footer className="mkt">
      <div className="wrap">
        <span className="brand" style={{ fontSize: 15 }}>
          <BrandMark style={{ width: 28, height: 28 }} />
          Placard
        </span>
        <span>© 2026 Placard</span>
        <nav aria-label="Footer">
          <Link href="/#examples">Examples</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/#faq">Help</Link>
          <Link href="/sites">Log in</Link>
        </nav>
      </div>
    </footer>
  );
}
