import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Render } from "@puckeditor/core/rsc";
import { ViewBeacon } from "@/components/site/view-beacon";
import { siteUrl } from "@/lib/config";
import { renderConfig } from "@/lib/sections/render-config";
import { resolveHost } from "@/lib/sites/resolve";
import type { PageData } from "@/lib/site/types";

type Props = { params: Promise<{ host: string }> };

async function hostFrom(params: Props["params"]) {
  const { host } = await params;
  try {
    return decodeURIComponent(host).toLowerCase();
  } catch {
    return host.toLowerCase();
  }
}

/** The emoji as an SVG favicon (data URL). */
const emojiIcon = (emoji: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${emoji}</text></svg>`,
  )}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const host = await hostFrom(params);
  const site = await resolveHost(host);
  if (!site) return {};

  const { title, description, favicon } = site.published.root.props;
  const url = siteUrl(site.slug);
  const origin = new URL(url).origin;
  const hero = site.published.content.find((s) => s.type === "Hero");
  const heroImage = hero?.type === "Hero" ? hero.props.image : undefined;

  return {
    title,
    description: description || undefined,
    icons: favicon ? { icon: emojiIcon(favicon) } : undefined,
    openGraph: {
      title,
      description: description || undefined,
      url,
      type: "website",
      images: heroImage ? [{ url: new URL(heroImage.src, origin).toString(), alt: heroImage.alt }] : undefined,
    },
    twitter: { card: "summary_large_image" },
  };
}

/** A published site, server-rendered with Puck's RSC `Render` (no editor code, no PostHog). */
export default async function LiveSitePage({ params }: Props) {
  const site = await resolveHost(await hostFrom(params));
  if (!site) notFound();

  // The footer badge shows on every site for now (Step 12 adds the Pro rule).
  const data: PageData = { ...site.published, root: { props: { ...site.published.root.props, showBadge: true } } };
  return (
    <>
      <Render config={renderConfig} data={data} />
      <ViewBeacon siteId={site.id} />
    </>
  );
}
