"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Copy, Ellipsis, ExternalLink, Eye, Pencil, Trash2 } from "lucide-react";
import { deleteSite, duplicateSite } from "@/app/(main)/(app)/sites/actions";
import { StatusBadge } from "@/components/app/status-badge";
import { SiteFrame } from "@/components/site/site-frame";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { siteHost, siteUrl } from "@/lib/config";
import type { SectionType } from "@/lib/sections/schemas";
import type { PageData, SectionData, SectionProps } from "@/lib/site/types";

const COMPONENTS: { [T in SectionType]: React.ComponentType<SectionProps<T>> } = {
  Hero, About, Features, Services, Gallery, Testimonials, Pricing, FAQ, CallToAction, Contact, Links,
};

export type SiteCardData = {
  id: string;
  name: string;
  slug: string;
  published: boolean;
  /** Theme, heading font and the first two sections of `published ?? draft`. */
  preview: { root: PageData["root"]["props"]; sections: SectionData[] };
};

function Thumbnail({ preview }: { preview: SiteCardData["preview"] }) {
  const { theme, font } = preview.root;
  return (
    <div className="aspect-[16/10] overflow-hidden border-b border-border bg-site-bg" data-site-theme={theme}>
      <SiteFrame width={1280} interactive={false}>
        <div className="site" data-site-theme={theme} data-site-font={font}>
          {preview.sections.map((section) => {
            const Component = COMPONENTS[section.type] as React.ComponentType<SectionData["props"]>;
            return <Component key={section.props.id} {...section.props} />;
          })}
        </div>
      </SiteFrame>
    </div>
  );
}

const itemClass = "gap-2.5 px-2.5 py-2";

/** A site on the dashboard (dashboard.html): thumbnail, name (opens the editor), status, address, views, actions. */
export function SiteCard({ site }: { site: SiteCardData }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const editHref = `/sites/${site.id}/edit`;

  return (
    <article className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-input">
      <Thumbnail preview={site.preview} />
      <div className="flex items-start gap-2 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate font-semibold">
              <Link
                href={editHref}
                className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-ring"
              >
                {site.name}
              </Link>
            </h2>
            <StatusBadge status={site.published ? "live" : "draft"} />
          </div>
          <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{site.published ? siteHost(site.slug) : "Not published yet"}</p>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Eye className="size-4" aria-hidden="true" />
            No views yet
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="relative z-10 grid size-10 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40 sm:size-8"
            aria-label={`Actions for ${site.name}`}
            disabled={pending}
          >
            <Ellipsis className="size-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-lg border border-border p-1 shadow-lg ring-0">
            <DropdownMenuItem asChild className={itemClass}>
              <Link href={editHref}>
                <Pencil aria-hidden="true" />
                Edit
              </Link>
            </DropdownMenuItem>
            {site.published ? (
              <DropdownMenuItem asChild className={itemClass}>
                <a href={siteUrl(site.slug)} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden="true" />
                  View live
                </a>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled className={itemClass}>
                <ExternalLink aria-hidden="true" />
                View live
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className={itemClass} onSelect={() => startTransition(() => duplicateSite(site.id))}>
              <Copy aria-hidden="true" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem variant="destructive" className={itemClass} onSelect={() => setConfirmOpen(true)}>
              <Trash2 aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-bold [overflow-wrap:anywhere]">Delete {site.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the site, its history and its stats, and frees the address. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(e) => {
                e.preventDefault();
                startTransition(async () => {
                  await deleteSite(site.id);
                  setConfirmOpen(false);
                });
              }}
            >
              Delete site
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
