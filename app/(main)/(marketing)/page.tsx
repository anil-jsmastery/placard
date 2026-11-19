import { createElement, type ComponentType } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { HeroDemo } from "@/components/marketing/hero-demo";
import { PlanCards } from "@/components/marketing/plan-cards";
import { Faq } from "@/components/marketing/faq";
import { SiteFrame } from "@/components/site/site-frame";
import { SiteImageOptions } from "@/components/site/site-image";
import { FEATURES, siteHost } from "@/lib/config";
import { DEMO_LOG, DEMO_PAGE, DEMO_PROMPT } from "@/lib/marketing/demo";
import { EXAMPLES } from "@/lib/marketing/examples";
import { SECTION_COMPONENTS } from "@/lib/sections/render-config";
import type { SectionData } from "@/lib/site/types";

/** One section of a page with the real section component (no editor, no footer). */
function Section({ section }: { section: SectionData }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...props } = section.props;
  return createElement(SECTION_COMPONENTS[section.type] as ComponentType<Record<string, unknown>>, props);
}

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main>
      {/* Hero: the headline, then the live demo (prompt → page builds itself). */}
      <section className="pt-16 sm:pt-24">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h1 className="font-display max-w-4xl text-[44px] font-extrabold leading-[0.98] sm:text-[80px]">
            Describe your site.<br className="hidden sm:block" /> Watch it build itself.
          </h1>
          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
              Write a sentence about your business, portfolio or event. The AI writes the words, picks the layout and builds a one-page site you can edit by hand and publish in one click.
            </p>
            <div className="flex shrink-0 flex-col gap-3">
              <div className="flex flex-wrap gap-3">
                <Link href="/sign-up" className="inline-flex h-11 items-center rounded-md bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary/90">Build your site free</Link>
                <Link href="#examples" className="inline-flex h-11 items-center rounded-md border border-input bg-card px-5 font-semibold hover:bg-accent">See examples</Link>
              </div>
              <p className="text-sm text-muted-foreground">Free includes 1 site and 10 AI requests a month.</p>
            </div>
          </div>

          <SiteImageOptions sizes="(min-width: 1024px) 800px, 100vw" preload={false}>
            <HeroDemo
              prompt={DEMO_PROMPT}
              log={DEMO_LOG}
              theme={DEMO_PAGE.root.props.theme}
              font={DEMO_PAGE.root.props.font}
              sections={DEMO_PAGE.content.map((section) => <Section key={section.props.id} section={section} />)}
            />
          </SiteImageOptions>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="scroll-mt-20 pt-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">Each of these started as one sentence</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <SiteImageOptions sizes="(min-width: 768px) 380px, 100vw" preload={false}>
              {EXAMPLES.map((example) => (
                <figure key={example.title} className="flex flex-col">
                  <SiteFrame width={1280} interactive={false} className="aspect-[4/3] overflow-hidden rounded-xl border border-border bg-white">
                    <div className="site" data-site-theme={example.page.root.props.theme} data-site-font={example.page.root.props.font}>
                      {example.page.content.map((section) => (
                        <Section key={section.props.id} section={section} />
                      ))}
                    </div>
                  </SiteFrame>
                  <figcaption className="mt-4">
                    <p className="font-semibold">{example.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">“{example.prompt}”</p>
                  </figcaption>
                </figure>
              ))}
            </SiteImageOptions>
          </div>
        </div>
      </section>

      {/* How it works: a real sequence, so it is numbered */}
      <section id="how" className="scroll-mt-20 pt-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">From sentence to live site</h2>
          <ol className="mt-10 grid gap-10 border-t border-border pt-10 md:grid-cols-3 md:gap-8">
            <li>
              <span className="font-display text-5xl font-extrabold text-muted-foreground/40">1</span>
              <h3 className="mt-3 text-xl font-semibold">Describe it</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">Pick what you’re building and write a sentence or two. Add your business name and a tone if you like.</p>
            </li>
            <li>
              <span className="font-display text-5xl font-extrabold text-muted-foreground/40">2</span>
              <h3 className="mt-3 text-xl font-semibold">Edit anything</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">Change any text, swap photos, drag sections around. Or ask the AI: “make the hero shorter”.</p>
            </li>
            <li>
              <span className="font-display text-5xl font-extrabold text-muted-foreground/40">3</span>
              <h3 className="mt-3 text-xl font-semibold">Publish</h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                One click puts your site at{" "}
                <span className="font-mono text-[0.9em] text-foreground [overflow-wrap:anywhere]">{siteHost("yourname")}</span>.
                {FEATURES.customDomains && " On Pro, connect your own domain."}
              </p>
            </li>
          </ol>
        </div>
      </section>

      {/* Pricing: numbers come from lib/plans.ts (same file that enforces the limits) */}
      <section id="pricing" className="scroll-mt-20 pt-28">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">Pricing</h2>
          <PlanCards />
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            An AI request is each time you ask the AI to build or change your site. Requests reset on the 1st of each month. Failed requests don’t count.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 pt-28">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 sm:px-8 lg:grid-cols-[1fr_2fr]">
          <h2 className="font-display text-4xl font-bold sm:text-5xl">Questions</h2>
          <Faq />
        </div>
      </section>

      {/* Closing call to action */}
      <section className="mx-auto max-w-6xl px-5 py-28 sm:px-8">
        <div className="flex flex-col items-start gap-8 rounded-2xl bg-primary px-8 py-14 text-primary-foreground sm:px-14 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="font-display max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">Your site is one sentence away.</h2>
          <Link href="/sign-up" className="inline-flex h-12 shrink-0 items-center rounded-md bg-white px-6 font-semibold text-foreground hover:bg-white/90">Build your site free</Link>
        </div>
      </section>
    </main>
  );
}
