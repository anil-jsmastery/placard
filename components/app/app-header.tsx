import { auth } from "@clerk/nextjs/server";
import { Logo } from "./logo";
import { AppNav } from "./app-nav";
import { LiveUsageMeter } from "./live-usage";
import { UserButton } from "@clerk/nextjs";
import { getPlanKey } from "@/lib/plan";
import { getLiveAiUsage } from "@/lib/usage";
import Link from "next/link";

// Logo, nav (Sites, Account), usage meter, Upgrade (Free only, hidden < sm), Clerk <UserButton /> (dashboard.html)
export async function AppHeader() {
  const { userId } = await auth();
  const [usage, plan] = await Promise.all([userId ? getLiveAiUsage(userId) : null, getPlanKey()]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Logo href="/dashboard" />
        <AppNav />
        <div className="ml-auto flex items-center gap-3">
          {usage ? <LiveUsageMeter usage={usage} /> : null}
          {plan === "free" ? (
            <Link
              href="/pricing"
              className="hidden h-8 items-center rounded-md border border-input bg-card px-3 text-sm font-medium hover:bg-accent sm:inline-flex"
            >
              Upgrade
            </Link>
          ) : null}
          <UserButton appearance={{ elements: { userButtonTrigger: "size-10! sm:size-8!", avatarBox: "size-10! sm:size-8!" } }} />
        </div>
      </div>
    </header>
  );
}
