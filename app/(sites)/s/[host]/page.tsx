import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Render } from "@puckeditor/core/rsc";
import { ViewBeacon } from "@/components/site/view-beacon";
import { siteUrl } from "@/lib/config";
import { renderConfig } from "@/lib/site/render-config";
import { tabIconDataUrl } from "@/lib/site/tab-icons";
import { resolveHost } from "@/lib/sites/resolve";

type Props = { params: Promise<{ host: string }> };

const decode = (s: string) => {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
};

// One lookup per request, shared by generateMetadata and the page. proxy.ts rewrote the portfolio's host here.
const getSite = cache(async (host: string) => resolveHost(decode(host)));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await getSite((await params).host);
  if (!site) return {};
  const r = site.published.root.props;
  const url = siteUrl(site.slug);
  const intro = site.published.content.find((s) => s.type === "Intro" && !s.props.hidden);
  const image = intro?.type === "Intro" ? intro.props.image : undefined;
  const description = r.description || undefined;
  return {
    title: r.title,
    description,
    icons: { icon: tabIconDataUrl(r.favicon) },
    openGraph: {
      title: r.title,
      description,
      url,
      type: "website",
      ...(image ? { images: [{ url: new URL(image.src, new URL(url).origin).toString(), alt: image.alt }] } : {}),
    },
    twitter: { card: "summary_large_image" },
  };
}

// A published portfolio, server-rendered from its JSON with Puck's <Render>: no editor code, no Clerk, no PostHog.
export default async function LivePage({ params }: Props) {
  const site = await getSite((await params).host);
  if (!site) notFound();
  // root.render builds the nav (and the sections their anchors) from the visible sections in `metadata`.
  const visible = site.published.content.filter((s) => !s.props.hidden);
  return (
    <>
      <Render config={renderConfig} data={site.published} metadata={{ content: visible }} />
      <ViewBeacon siteId={site.id} />
    </>
  );
}
