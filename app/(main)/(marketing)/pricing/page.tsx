import { PricingTable } from "@clerk/nextjs";
import { Check, Minus } from "lucide-react";
import { pricingTableAppearance } from "@/lib/clerk-appearance";
import { APP_DOMAIN, FEATURES } from "@/lib/config";
import { PLANS, formatBytes } from "@/lib/plans";

function Included() {
  return (
    <>
      <Check className="size-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">Included</span>
    </>
  );
}

function NotIncluded() {
  return (
    <>
      <Minus className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Not included</span>
    </>
  );
}

// The comparison table, from lib/plans.ts. The custom-domain row shows only with the switch on (design-system §14).
const ROWS: { label: string; free: React.ReactNode; pro: React.ReactNode; customDomains?: true }[] = [
  { label: "Sites", free: PLANS.free.sites, pro: PLANS.pro.sites },
  { label: "AI requests per month", free: PLANS.free.aiRequests, pro: PLANS.pro.aiRequests },
  { label: `Address on ${APP_DOMAIN}`, free: <Included />, pro: <Included /> },
  { label: "Custom domain", free: <NotIncluded />, pro: <Included />, customDomains: true },
  { label: "“Made with Placard” badge", free: "Shown", pro: "Removable" },
  { label: "Visitor stats", free: "Total views", pro: "Chart, referrers, devices" },
  { label: "Image uploads", free: formatBytes(PLANS.free.uploadBytes), pro: formatBytes(PLANS.pro.uploadBytes) },
];

// pricing.html: the plan cards are Clerk's <PricingTable />; the comparison table and note are ours.
export default function PricingPage() {
  const rows = ROWS.filter((row) => !row.customDomains || FEATURES.customDomains);
  return (
    <main className="pt-16 pb-24 sm:pt-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <h1 className="font-display text-5xl font-extrabold sm:text-6xl">Pricing</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          {FEATURES.customDomains
            ? "Start free. Upgrade when you need more sites, your own domain or full stats."
            : "Start free. Upgrade when you need more sites, full stats or no badge."}
        </p>
        <div className="mt-10 max-w-4xl">
          <PricingTable appearance={pricingTableAppearance} />
        </div>
        <section className="mt-20 max-w-4xl" aria-labelledby="cmp-h">
          <h2 id="cmp-h" className="font-display text-3xl font-bold">
            Compare plans
          </h2>
          <div className="relative mt-6 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="w-1/2 pb-3 font-medium">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th className="pb-3 font-semibold text-foreground">{PLANS.free.name}</th>
                  <th className="pb-3 font-semibold text-foreground">{PLANS.pro.name}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label} className="border-t border-border">
                    <th scope="row" className="py-3.5 pr-4 font-medium">
                      {row.label}
                    </th>
                    <td className="py-3.5 pr-4">{row.free}</td>
                    <td className="py-3.5">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
            An AI request is each time you ask the AI to build or change your site. Requests reset on the 1st of each month
            (UTC). Failed requests don’t count.
          </p>
        </section>
      </div>
    </main>
  );
}
