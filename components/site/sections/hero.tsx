import type { SectionProps } from "@/lib/site/types";
import { SafeLink } from "../safe-link";
import { SiteImage } from "../site-image";

const primaryClass =
  "inline-flex h-11 items-center rounded-site bg-site-accent px-5 font-semibold text-site-accent-fg hover:opacity-90";
const secondaryClass =
  "inline-flex h-11 items-center rounded-site border border-site-border bg-site-surface px-5 font-semibold hover:opacity-90";

function Buttons({ primaryButton, secondaryButton, className }: Pick<SectionProps<"Hero">, "primaryButton" | "secondaryButton"> & { className: string }) {
  if (!primaryButton && !secondaryButton) return null;
  return (
    <div className={className}>
      {primaryButton && <SafeLink href={primaryButton.href} className={primaryClass}>{primaryButton.label}</SafeLink>}
      {secondaryButton && <SafeLink href={secondaryButton.href} className={secondaryClass}>{secondaryButton.label}</SafeLink>}
    </div>
  );
}

export function Hero({ headline, subheadline, primaryButton, secondaryButton, image, layout }: SectionProps<"Hero">) {
  // Split needs an image; without one it falls back to the centered layout without the image row.
  if (layout === "split" && image) {
    return (
      <section data-section="Hero" className="px-6 pt-16 pb-20 @2xl:pt-24 @2xl:pb-28">
        <div className="mx-auto grid max-w-5xl items-center gap-12 @5xl:grid-cols-2">
          <div>
            <h1 className="text-4xl font-bold leading-[1.05] @2xl:text-6xl">{headline}</h1>
            {subheadline && <p className="mt-5 max-w-md text-lg leading-relaxed text-site-muted">{subheadline}</p>}
            <Buttons primaryButton={primaryButton} secondaryButton={secondaryButton} className="mt-8 flex flex-wrap gap-3" />
          </div>
          <SiteImage image={image} className="aspect-[4/3]" preload />
        </div>
      </section>
    );
  }

  return (
    <section data-section="Hero" className="px-6 pt-20 pb-20 @2xl:pt-28">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-4xl font-bold leading-[1.05] @2xl:text-6xl">{headline}</h1>
        {subheadline && <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-site-muted">{subheadline}</p>}
        <Buttons primaryButton={primaryButton} secondaryButton={secondaryButton} className="mt-8 flex flex-wrap justify-center gap-3" />
        {layout === "centered" && image && <SiteImage image={image} className="mt-14 aspect-[16/9]" preload />}
      </div>
    </section>
  );
}
