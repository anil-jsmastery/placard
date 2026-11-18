import Link from "next/link";
import { Logo } from "@/components/app/logo";
import { APP_NAME } from "@/lib/config";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
        <Logo />
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground sm:ml-8">
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/#faq" className="hover:text-foreground">FAQ</Link>
          <Link href="/sign-in" className="hover:text-foreground">Sign in</Link>
          <Link href="#" className="hover:text-foreground">Terms</Link>
          <Link href="#" className="hover:text-foreground">Privacy</Link>
        </nav>
        <p className="text-sm text-muted-foreground sm:ml-auto">© 2026 {APP_NAME}</p>
      </div>
    </footer>
  );
}
