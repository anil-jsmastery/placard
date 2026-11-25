"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";
import { Eye } from "lucide-react";
import { deleteSite } from "@/app/(main)/(app)/sites/actions";
import { publishSite, unpublishSite } from "@/app/(main)/sites/[id]/edit/actions";
import { Status } from "@/components/app/status";
import { useToast } from "@/components/app/toast";
import { SiteFrame } from "@/components/site/site-frame";
import { DropdownMenu, DropdownMenuPortal, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { siteHost, siteUrl } from "@/lib/config";
import type { PageData } from "@/lib/site/types";

export type SiteCardData = { id: string; name: string; slug: string | null; live: boolean; page: PageData; edited: string };

// .shell.scard: the live thumbnail (opens the editor), name, status, address line, views and the ••• menu.
export function SiteCard({ site }: { site: SiteCardData }) {
  const router = useRouter();
  const toast = useToast();
  const [sure, setSure] = useState(false);
  const [, startTransition] = useTransition();
  const href = `/sites/${site.id}/edit`;

  const publish = () =>
    startTransition(async () => {
      try {
        const res = await publishSite(site.id);
        toast.show(res.ok ? `Published. Live at ${res.host}` : `Can't save: ${res.message} (${res.path})`);
      } catch {
        toast.show("Something went wrong. Try again.");
      }
      router.refresh();
    });

  const unpublish = () =>
    startTransition(async () => {
      try {
        await unpublishSite(site.id);
        toast.show(`${site.name} is a draft again.`);
      } catch {
        toast.show("Something went wrong. Try again.");
      }
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      await deleteSite(site.id);
      toast.show(`${site.name} deleted.`);
    });

  return (
    <article className="shell scard">
      <div className="shell-body">
        <div
          className="thumb"
          role="link"
          tabIndex={0}
          aria-label={`Open ${site.name} in the editor`}
          onClick={() => router.push(href)}
          onKeyDown={(e) => {
            if (e.key === "Enter") router.push(href);
          }}
        >
          <SiteFrame page={site.page} />
        </div>
        <div className="smeta">
          <div className="r1">
            <b>{site.name}</b>
            <Status live={site.live} />
            <span className="menu-wrap">
              <DropdownMenu onOpenChange={(open) => !open && setSure(false)}>
                <DropdownMenuTrigger className="dots" aria-label={`More actions for ${site.name}`}>•••</DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuPrimitive.Content className="menu show" align="end" sideOffset={4} style={{ position: "static" }}>
                    <DropdownMenuPrimitive.Item asChild onSelect={() => router.push(href)}>
                      <button type="button">Open editor</button>
                    </DropdownMenuPrimitive.Item>
                    <DropdownMenuPrimitive.Item asChild onSelect={site.live ? unpublish : publish}>
                      <button type="button">{site.live ? "Unpublish" : "Publish"}</button>
                    </DropdownMenuPrimitive.Item>
                    <DropdownMenuPrimitive.Item
                      asChild
                      onSelect={(e) => {
                        if (!sure) {
                          e.preventDefault();
                          setSure(true);
                          return;
                        }
                        remove();
                      }}
                    >
                      <button type="button" className="danger">{sure ? "Click again to delete" : "Delete portfolio"}</button>
                    </DropdownMenuPrimitive.Item>
                  </DropdownMenuPrimitive.Content>
                </DropdownMenuPortal>
              </DropdownMenu>
            </span>
          </div>
          {site.live && site.slug ? (
            <div className="s-url live">
              <a href={siteUrl(site.slug)} target="_blank" rel="noopener">{siteHost(site.slug)}</a>
            </div>
          ) : (
            <div className="s-url">Not published yet, edited {site.edited}</div>
          )}
          {/* Step 9 counts views. */}
          <div className="r3"><Eye />No views yet</div>
        </div>
      </div>
    </article>
  );
}
