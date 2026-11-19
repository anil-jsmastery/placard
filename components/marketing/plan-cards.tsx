import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { APP_NAME, FEATURES, siteHost } from "@/lib/config";
import { PLANS, formatBytes } from "@/lib/plans";

const sites = (n: number) => `${n} ${n === 1 ? "site" : "sites"}`;

function Line({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <li className={muted ? "flex gap-2.5 text-muted-foreground" : "flex gap-2.5"}>
      {muted ? <Minus className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <span>{children}</span>
    </li>
  );
}

/** The landing page's Free and Pro cards. Prices and limits come from lib/plans.ts, the file that enforces them. */
export function PlanCards() {
  const { free, pro } = PLANS;
  return (
    <div className="mt-10 grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
      <div className="flex flex-col rounded-xl border border-border bg-card p-7">
        <h3 className="text-lg font-semibold">{free.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">For one site, to try it out.</p>
        <p className="mt-6"><span className="font-display text-5xl font-bold">${free.price}</span></p>
        <ul className="mt-6 flex-1 space-y-3 text-sm">
          <Line>{sites(free.sites)}</Line>
          <Line>{free.aiRequests} AI requests a month</Line>
          <Line>
            Your site at <span className="font-mono text-[0.92em] [overflow-wrap:anywhere]">{siteHost("yourname")}</span>
          </Line>
          <Line>Total visitor count</Line>
          <Line>{formatBytes(free.uploadBytes)} of image uploads</Line>
          <Line muted>“Made with {APP_NAME}” badge on your site</Line>
        </ul>
        <Link href="/sign-up" className="mt-8 inline-flex h-11 items-center justify-center rounded-md border border-input bg-card font-semibold hover:bg-accent">Start free</Link>
      </div>
      <div className="flex flex-col rounded-xl border-2 border-primary bg-card p-7">
        <h3 className="text-lg font-semibold">{pro.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">For freelancers and small businesses.</p>
        <p className="mt-6"><span className="font-display text-5xl font-bold">${pro.price}</span><span className="text-muted-foreground"> / month</span></p>
        <ul className="mt-6 flex-1 space-y-3 text-sm">
          <Line>{sites(pro.sites)}</Line>
          <Line>{pro.aiRequests} AI requests a month</Line>
          {FEATURES.customDomains && <Line>Connect your own domain</Line>}
          <Line>Remove the badge</Line>
          <Line>30-day visitor chart, referrers and devices</Line>
          <Line>{formatBytes(pro.uploadBytes)} of image uploads</Line>
        </ul>
        <Link href="/pricing" className="mt-8 inline-flex h-11 items-center justify-center rounded-md bg-primary font-semibold text-primary-foreground hover:bg-primary/90">Get Pro</Link>
      </div>
    </div>
  );
}
