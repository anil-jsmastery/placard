import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { checkSiteLimit } from "@/lib/limits";
import { PLANS, formatBytes } from "@/lib/plans";
import { getAiUsage, getStorageUsed, nextResetUtc } from "@/lib/usage";
import { ManageAccountButton, ManageBillingButton, UpgradeButton } from "./account-buttons";

const longDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/** When Pro renews, from the Clerk subscription; null if Clerk can't say. */
async function renewsOn(userId: string) {
  try {
    const subscription = await (await clerkClient()).billing.getUserBillingSubscription(userId);
    return subscription.nextPayment ? new Date(subscription.nextPayment.date) : null;
  } catch {
    return null;
  }
}

function Meter({ label, value, limit, pct, note }: { label: string; value: string | number; limit: string | number; pct: number; note?: string }) {
  const width = Math.round(Math.max(0, Math.min(100, pct)));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className="font-semibold text-foreground">{value}</span> of {limit}
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={label}
        aria-valuenow={width}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span className="block h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
      </div>
      {note ? <p className="mt-1.5 text-xs text-muted-foreground">{note}</p> : null}
    </div>
  );
}

// account.html: plan, usage this month and profile. The plan is read from Clerk; usage from ai_runs, sites and uploads.
export default async function AccountPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const [user, usage, sites, storage] = await Promise.all([
    currentUser(),
    getAiUsage(userId),
    checkSiteLimit(userId),
    getStorageUsed(userId),
  ]);
  const plan = sites.plan;
  const renewal = plan === "pro" ? await renewsOn(userId) : null;
  const reset = nextResetUtc().toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  const storageLimit = PLANS[plan].uploadBytes;
  const name = user?.fullName || user?.username || "";
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Account</h1>

      <section className="mt-8 rounded-xl border border-border bg-card p-6" aria-labelledby="plan-h">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="plan-h" className="text-sm text-muted-foreground">
              Plan
            </h2>
            <p className="mt-1 font-display text-2xl font-bold">{PLANS[plan].name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {plan === "pro"
                ? renewal
                  ? `Renews on ${longDate(renewal)}`
                  : `${PLANS.pro.sites} sites and ${PLANS.pro.aiRequests} AI requests a month.`
                : `${PLANS.free.sites} site and ${usage.allowance} AI requests a month.`}
            </p>
          </div>
          {plan === "pro" ? <ManageBillingButton /> : <UpgradeButton />}
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-6" aria-labelledby="use-h">
        <h2 id="use-h" className="font-semibold">
          Usage this month
        </h2>
        <div className="mt-5 space-y-6">
          <Meter
            label="AI requests used"
            value={usage.used}
            limit={usage.allowance}
            pct={usage.allowance > 0 ? (usage.used / usage.allowance) * 100 : 100}
            note={`Resets on ${reset} (UTC). ${usage.left} left.`}
          />
          <Meter
            label="Sites"
            value={sites.count}
            limit={sites.limit}
            pct={(sites.count / sites.limit) * 100}
            note={plan === "free" ? `Upgrade to Pro for up to ${PLANS.pro.sites} sites.` : undefined}
          />
          <Meter
            label="Image storage"
            value={formatBytes(storage)}
            limit={formatBytes(storageLimit)}
            pct={(storage / storageLimit) * 100}
          />
        </div>
      </section>

      <section className="mt-4 rounded-xl border border-border bg-card p-6" aria-labelledby="prof-h">
        <h2 id="prof-h" className="sr-only">
          Profile
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          {user?.imageUrl ? (
            <Image src={user.imageUrl} alt="" width={48} height={48} unoptimized className="size-12 rounded-full" />
          ) : (
            <span className="grid size-12 place-items-center rounded-full bg-muted font-semibold" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{name || email}</p>
            <p className="truncate text-sm text-muted-foreground">{email}</p>
          </div>
          <ManageAccountButton />
        </div>
      </section>
    </main>
  );
}
