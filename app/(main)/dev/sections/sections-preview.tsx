"use client";

import { useEffect, useState } from "react";
import { FONTS, THEMES, type SectionType } from "@/lib/sections/schemas";
import { FONT_META, THEME_META, type Font, type Theme } from "@/lib/site/themes";
import type { PageData, SectionData, SectionProps } from "@/lib/site/types";
import { SiteRoot } from "@/components/site/site-root";
import { Hero } from "@/components/site/sections/hero";
import { About } from "@/components/site/sections/about";
import { Features } from "@/components/site/sections/features";
import { Services } from "@/components/site/sections/services";
import { Gallery } from "@/components/site/sections/gallery";
import { Testimonials } from "@/components/site/sections/testimonials";
import { Pricing } from "@/components/site/sections/pricing";
import { FAQ } from "@/components/site/sections/faq";
import { CallToAction } from "@/components/site/sections/call-to-action";
import { Contact } from "@/components/site/sections/contact";
import { Links } from "@/components/site/sections/links";

const COMPONENTS: { [T in SectionType]: React.ComponentType<SectionProps<T>> } = {
  Hero, About, Features, Services, Gallery, Testimonials, Pricing, FAQ, CallToAction, Contact, Links,
};

function Section({ section }: { section: SectionData }) {
  const Component = COMPONENTS[section.type] as React.ComponentType<SectionData["props"]>;
  return <Component {...section.props} />;
}

const isTheme = (v: string): v is Theme => (THEMES as readonly string[]).includes(v);
const isFont = (v: string): v is Font => (FONTS as readonly string[]).includes(v);

const chip = "min-h-9 rounded-md px-2.5 py-1.5 aria-pressed:bg-primary aria-pressed:text-primary-foreground sm:min-h-0";

/** The sample page with the reference's theme and heading-font switcher (open with #midnight-sans to preselect). */
export function SectionsPreview({ page }: { page: PageData }) {
  const [theme, setTheme] = useState<Theme>(page.root.props.theme);
  const [font, setFont] = useState<Font>(page.root.props.font);

  useEffect(() => {
    const [t, f] = window.location.hash.replace("#", "").split("-");
    // Reading the URL hash once after mount, as the reference does.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (t && isTheme(t)) setTheme(t);
    if (f && isFont(f)) setFont(f);
  }, []);

  const hero = page.content.find((s) => s.type === "Hero");

  return (
    <>
      <SiteRoot {...page.root.props} theme={theme} font={font} className="min-h-screen">
        {page.content.map((section) => (
          <Section key={section.props.id} section={section} />
        ))}
      </SiteRoot>

      {hero?.type === "Hero" && (
        <div className="site" data-site-theme={theme} data-site-font={font}>
          <div className="border-y border-dashed border-site-border py-2 text-center font-sans text-xs text-site-muted">
            Variant shown for reference: Hero with layout “centered”
          </div>
          <Hero {...hero.props} layout="centered" />
        </div>
      )}

      <div
        className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1.5 font-sans text-xs font-medium shadow-lg"
        role="toolbar"
        aria-label="Theme switcher"
      >
        {THEMES.map((t) => (
          <button key={t} type="button" aria-pressed={theme === t} onClick={() => setTheme(t)} className={chip}>
            {THEME_META[t].label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        {FONTS.map((f) => (
          <button key={f} type="button" aria-pressed={font === f} onClick={() => setFont(f)} className={chip}>
            {FONT_META[f].label}
          </button>
        ))}
      </div>
    </>
  );
}
