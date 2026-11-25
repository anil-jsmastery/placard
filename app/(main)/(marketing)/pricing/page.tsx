import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { UpgradeButton } from "@/components/billing/upgrade-button";
import { getPlanKey } from "@/lib/plan";
import { formatBytes, PLANS } from "@/lib/plans";

export const metadata = { title: "Pricing · Placard" };

const FREE = PLANS.free;
const PRO = PLANS.pro;

function Tick() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8.5l3 3 7-7" /></svg>
  );
}
function Yes() {
  return (
    <span className="yes">
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M3.5 8.5l3 3 6-6.5" /></svg>
    </span>
  );
}

export default async function PricingPage() {
  const { userId } = await auth();
  const pro = userId ? (await getPlanKey()) === "pro" : false;

  return (
    <main className="page on" data-page="pricing">
      <section className="wrap pr-hero">
        <h1>Pricing</h1>
        <p>Start free. Upgrade when you need more portfolios, fuller visitor stats or a page without the badge.</p>
      </section>
      <section className="wrap">
        <div className="pr-plans">
          <article className="shell plan">
            <div className="shell-head"><b>{FREE.name}</b>{!pro && <span className="cur">Your plan</span>}</div>
            <div className="shell-body">
              <div className="amt">${FREE.price}<small> / month</small></div>
              <p className="who">One portfolio to try things out, or to keep a simple page online.</p>
              <ul>
                <li><Tick />{FREE.sites} portfolio</li>
                <li><Tick />{FREE.aiRequests} AI requests a month</li>
                <li><Tick />{formatBytes(FREE.uploadBytes)} of photo uploads</li>
                <li><Tick />Total view count</li>
                <li><Tick />Made with Placard badge shown</li>
              </ul>
              {userId ? (
                <Link className="btn btn-soft" href="/sites" style={{ justifyContent: "center" }}>Go to your sites</Link>
              ) : (
                <Link className="btn btn-soft" href="/sign-up" style={{ justifyContent: "center" }}>Start for free</Link>
              )}
            </div>
          </article>
          <article className="shell plan hot">
            <div className="shell-head"><b>{PRO.name}</b><span className="new">{pro ? "Your plan" : "Most picked"}</span></div>
            <div className="shell-body">
              <div className="amt">${PRO.price}<small> / month</small></div>
              <p className="who">For working creatives who keep their portfolio up to date. Billed monthly, cancel any time.</p>
              <ul>
                <li><Tick />{PRO.sites} portfolios</li>
                <li><Tick />{PRO.aiRequests} AI requests a month</li>
                <li><Tick />{formatBytes(PRO.uploadBytes)} of photo uploads</li>
                <li><Tick />Visitor chart, referrers and devices</li>
                <li><Tick />Remove the badge</li>
              </ul>
              <UpgradeButton signedIn={!!userId} pro={pro} />
            </div>
          </article>
        </div>

        <div className="cmp">
          <h2>Compare plans</h2>
          <table>
            <thead>
              <tr>
                <th scope="col"><span className="sr" style={{ position: "absolute", left: -9999 }}>Feature</span></th>
                <th scope="col">{FREE.name}</th>
                <th scope="col">{PRO.name}</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Portfolios</td><td>{FREE.sites}</td><td>{PRO.sites}</td></tr>
              <tr><td>AI requests per month</td><td>{FREE.aiRequests}</td><td>{PRO.aiRequests}</td></tr>
              <tr><td>Photo uploads</td><td>{formatBytes(FREE.uploadBytes)}</td><td>{formatBytes(PRO.uploadBytes)}</td></tr>
              <tr><td>Free placard address</td><td><Yes /></td><td><Yes /></td></tr>
              <tr><td>Visitor stats</td><td>Total views</td><td>Chart, referrers, devices</td></tr>
              <tr><td>“Made with Placard” badge</td><td>Always shown</td><td>Removable</td></tr>
            </tbody>
          </table>
          <p className="note">An AI request is each time you ask the AI to build, change or prettify your portfolio. Hand edits are always free. Requests reset on the 1st of each month (UTC), and failed requests don&apos;t count.</p>
        </div>

        <div className="pr-faq">
          <h2>Billing questions</h2>
          <div className="faq-list">
            <details open>
              <summary>Can I cancel Pro whenever I want?<span className="pm">+</span></summary>
              <p>Yes. Pro is billed monthly and you can cancel from your account page. You keep Pro until the end of the month you paid for.</p>
            </details>
            <details>
              <summary>What happens to my portfolios if I go back to Free?<span className="pm">+</span></summary>
              <p>You pick one portfolio to keep published. The others switch to drafts and come back the moment you upgrade again. Nothing is deleted.</p>
            </details>
            <details>
              <summary>What if I run out of AI requests?<span className="pm">+</span></summary>
              <p>You can still edit everything by hand. New requests arrive on the 1st of the month, or right away if you upgrade.</p>
            </details>
          </div>
        </div>
      </section>
      <div style={{ height: 110 }}></div>
    </main>
  );
}
