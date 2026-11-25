import Link from "next/link";
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { eq, sum } from "drizzle-orm";
import { Eye, Image as ImageIcon, LayoutGrid, Sparkles } from "lucide-react";
import { ManageBillingButton, ProfileActions } from "@/components/account/account-actions";
import { db, sites, uploads } from "@/lib/db";
import { getPlanKey } from "@/lib/plan";
import { formatBytes, PLANS, resetDate } from "@/lib/plans";
import { getAiUsage, monthStartUtc } from "@/lib/usage";

export const metadata = { title: "Account · Placard" };

const PRO = PLANS.pro;
const day = (ms: number, month: "long" | "short") =>
  new Date(ms).toLocaleDateString("en-US", { month, day: "numeric", timeZone: "UTC" });

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.6 12.3c0-.8-.1-1.5-.2-2.3H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.3-4.8 3.3-8z" /><path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.7c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" /><path fill="#FBBC05" d="M5.8 14.2a6.6 6.6 0 0 1 0-4.3V7H2.1a11 11 0 0 0 0 9.9l3.7-2.7z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7l3.7 2.9C6.7 7.3 9.1 5.4 12 5.4z" /></svg>
  );
}
function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#17171C" d="M12 1.5a10.5 10.5 0 0 0-3.3 20.5c.5.1.7-.2.7-.5v-1.8c-2.9.6-3.5-1.4-3.5-1.4-.5-1.2-1.2-1.5-1.2-1.5-1-.7 0-.6 0-.6 1 .1 1.6 1.1 1.6 1.1.9 1.6 2.5 1.2 3.1.9.1-.7.4-1.2.7-1.4-2.3-.3-4.8-1.2-4.8-5.2 0-1.1.4-2.1 1.1-2.8-.1-.3-.5-1.4.1-2.8 0 0 .9-.3 2.9 1.1a10 10 0 0 1 5.2 0c2-1.4 2.9-1.1 2.9-1.1.6 1.4.2 2.5.1 2.8.7.7 1.1 1.7 1.1 2.8 0 4-2.5 4.9-4.8 5.2.4.3.7 1 .7 2v2.9c0 .3.2.6.7.5A10.5 10.5 0 0 0 12 1.5z" /></svg>
  );
}

// "Signed in with": the first external account's provider, else Email.
function signedInWith(provider: string | undefined) {
  const p = provider?.replace(/^oauth_/, "");
  if (!p) return { label: "Email", icon: null };
  if (p === "google") return { label: "Google", icon: <GoogleIcon /> };
  if (p === "github") return { label: "GitHub", icon: <GitHubIcon /> };
  return { label: p.charAt(0).toUpperCase() + p.slice(1), icon: null };
}

// Pro's subscription item from Clerk Billing: when it renews and the next payment. Null if Clerk can't say.
async function proSubscription(userId: string) {
  try {
    const sub = await (await clerkClient()).billing.getUserBillingSubscription(userId);
    const item = sub.subscriptionItems.find((i) => i.plan?.slug === "pro" && i.status === "active");
    const next = sub.nextPayment ?? item?.nextPayment ?? null;
    const date = next?.date ?? item?.periodEnd ?? null;
    const amount = next ? `${next.amount.currencySymbol}${next.amount.amountFormatted}` : `$${PRO.price}.00`;
    return { date, amount };
  } catch (err) {
    console.error("billing subscription unavailable", err);
    return null;
  }
}

export default async function AccountPage() {
  const user = (await currentUser())!;
  const userId = user.id;
  const planKey = await getPlanKey();
  const pro = planKey === "pro";
  const plan = PLANS[planKey];
  const [usage, siteCount, [stored], sub] = await Promise.all([
    getAiUsage(userId),
    db.$count(sites, eq(sites.userId, userId)),
    db.select({ bytes: sum(uploads.bytes) }).from(uploads).where(eq(uploads.userId, userId)),
    pro ? proSubscription(userId) : null,
  ]);
  const bytes = Number(stored?.bytes ?? 0);

  const monthStart = monthStartUtc();
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
  const siteFull = siteCount >= plan.sites;
  const pct = (n: number, of: number) => `${of > 0 ? Math.min(100, (n / of) * 100) : 100}%`;

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || "";
  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "";
  const initials = (name || email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  const via = signedInWith(user.externalAccounts[0]?.provider);
  const since = new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <>
      <div className="p-head"><div><h1>Account</h1><p>Your plan, what you&apos;ve used this month and your profile.</p></div></div>
      <div className="acc">
        <div className="acc-col">
          <article className="shell">
            <div className="shell-head">
              <b>Plan</b>
              <span className="more" style={{ fontSize: 13.5 }}>{pro ? "Billed monthly" : `Monthly AI requests reset on ${resetDate(new Date(), "short")}`}</span>
            </div>
            <div className="shell-body">
              <div className="plan-row">
                <div>
                  <div className="nm">{plan.name}{pro && <span className="pro-tag">Active</span>}</div>
                  <p>
                    {pro
                      ? `$${PRO.price} a month${sub?.date ? `, renews on ${day(sub.date, "long")}` : ""}. ${PRO.sites} portfolios and ${PRO.aiRequests} AI requests a month.`
                      : `${PLANS.free.sites} portfolio and ${PLANS.free.aiRequests} AI requests a month. Always free.`}
                  </p>
                </div>
                <div className="acts">
                  {pro ? <ManageBillingButton /> : <Link className="btn btn-blue" href="/pricing">Upgrade to Pro</Link>}
                </div>
              </div>
            </div>
          </article>
          <article className="shell">
            <div className="shell-head">
              <b>Usage this month</b>
              <span className="more" style={{ fontSize: 13.5 }}>{day(monthStart.getTime(), "short")} to {day(monthEnd.getTime(), "short")}</span>
            </div>
            <div className="shell-body">
              <div className="u-list">
                <div className="u-item">
                  <div className="u-top">AI requests used<span><b>{usage.used}</b> of {usage.allowance}</span></div>
                  <div className="bar"><i style={{ width: pct(usage.used, usage.allowance) }}></i></div>
                  <small>Resets on {resetDate()} (UTC). {usage.left} left. Builds, changes and Prettify each use one. Hand edits never count.</small>
                </div>
                <div className="u-item">
                  <div className="u-top">Portfolios<span><b>{siteCount}</b> of {plan.sites}</span></div>
                  <div className={siteFull ? "bar full" : "bar"}><i style={{ width: pct(siteCount, plan.sites) }}></i></div>
                  <small>
                    {siteFull && !pro ? (
                      <>You’re at your limit. <Link href="/pricing">Upgrade to Pro</Link> for up to {PRO.sites}.</>
                    ) : (
                      `Room for ${Math.max(0, plan.sites - siteCount)} more.`
                    )}
                  </small>
                </div>
                <div className="u-item">
                  <div className="u-top">Photo storage<span><b>{formatBytes(bytes)}</b> of {formatBytes(plan.uploadBytes)}</span></div>
                  <div className="bar"><i style={{ width: pct(bytes, plan.uploadBytes) }}></i></div>
                  <small>Photos you upload in the editor count here. Library photos are free.</small>
                </div>
              </div>
            </div>
          </article>
        </div>
        <div className="acc-col">
          <article className="shell">
            <div className="shell-head"><b>Profile</b></div>
            <div className="shell-body">
              <div className="prof">
                {user.hasImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="avatar object-cover" src={user.imageUrl} alt="" />
                ) : (
                  <span className="avatar">{initials}</span>
                )}
                <div><b>{name || email}</b><span>{email}</span></div>
              </div>
              <dl className="kv">
                <div><dt>Signed in with</dt><dd>{via.icon && <span className="g-ic">{via.icon}</span>}{via.label}</dd></div>
                <div><dt>Member since</dt><dd>{since}</dd></div>
              </dl>
              <ProfileActions />
            </div>
          </article>
          {pro ? (
            <article className="shell">
              <div className="shell-head"><b>Billing</b><span className="more" style={{ fontSize: 13.5 }}>Monthly</span></div>
              <div className="shell-body">
                <dl className="kv" style={{ marginTop: 0 }}>
                  <div><dt>Next payment</dt><dd>{sub?.date ? `${sub.amount} on ${day(sub.date, "short")}` : "–"}</dd></div>
                </dl>
              </div>
            </article>
          ) : (
            <article className="shell">
              <div className="shell-head"><b>What Pro adds</b><span className="more" style={{ fontSize: 13.5 }}>${PRO.price} a month</span></div>
              <div className="shell-body">
                <ul className="perk-list">
                  <li><span className="pi"><LayoutGrid /></span><span><b>{PRO.sites} portfolios</b>instead of {PLANS.free.sites}</span></li>
                  <li><span className="pi"><Sparkles /></span><span><b>{PRO.aiRequests} AI requests</b>every month</span></li>
                  <li><span className="pi"><Eye /></span><span><b>Full visitor stats</b>chart, referrers and devices</span></li>
                  <li><span className="pi"><ImageIcon /></span><span><b>{formatBytes(PRO.uploadBytes)} of photos</b>and no Placard badge</span></li>
                </ul>
                <Link className="btn btn-blue" href="/pricing" style={{ width: "100%", justifyContent: "center", marginTop: 16 }}>Upgrade to Pro</Link>
              </div>
            </article>
          )}
        </div>
      </div>
    </>
  );
}
