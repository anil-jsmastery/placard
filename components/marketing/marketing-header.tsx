import Link from "next/link";
import { Logo } from "@/components/app/logo";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5 sm:px-8">
        <Logo />
        <nav aria-label="Main" className="hidden items-center gap-1 text-sm font-medium md:flex">
          <Link href="/#examples" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground">Examples</Link>
          <Link href="/#how" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground">How it works</Link>
          <Link href="/pricing" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground">Pricing</Link>
          <Link href="/#faq" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground">FAQ</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/sign-in" className="hidden h-9 items-center rounded-md px-3 text-sm font-medium hover:bg-accent sm:inline-flex">Sign in</Link>
          <Link href="/sign-up" className="inline-flex h-10 items-center rounded-md bg-primary px-4 sm:h-9 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Start building</Link>
        </div>
      </div>
    </header>
  );
}
