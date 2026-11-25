"use client";

import type { ComponentConfig, Config } from "@puckeditor/core";
import { SiteShell } from "@/components/site/site-shell";
import { sectionFields } from "@/lib/editor/fields";
import { CATALOG } from "@/lib/sections/catalog";
import { SECTION_TYPES, type SectionType } from "@/lib/sections/schemas";
import { sectionComponents, type SiteMetadata } from "@/lib/site/render-config";
import type { PageData } from "@/lib/site/types";

type RootProps = PageData["root"]["props"];

// What the editor passes to <Puck metadata>: the page's visible sections (no hidden ones), for the nav links and the empty state.
// root.render reads them from there, not from Puck's store, so it also renders outside <Puck> (the test).
export type EditorMetadata = SiteMetadata;

// The editor's .site: Step 2's SiteShell around Puck's drop zone (the sections).
function EditorSite({ children, puck, ...r }: RootProps & { children: React.ReactNode; puck?: { metadata?: EditorMetadata } }) {
  const content = puck?.metadata?.content ?? [];
  return (
    <SiteShell root={r} sections={content}>
      {/* The drop zone stays at the same place in the tree, so it isn't remounted when the first section arrives. */}
      <div className={content.length === 0 ? "pf-empty" : undefined}>
        {content.length === 0 && <div><b>Your page is empty</b>Add sections from the Add tab, then press Prettify to style it.</div>}
        {children}
      </div>
    </SiteShell>
  );
}

// The live page's components (render-config.ts) with the editor's labels, defaults and fields.
function section<T extends SectionType>(type: T): ComponentConfig {
  return {
    ...sectionComponents[type],
    label: CATALOG[type].label,
    defaultProps: CATALOG[type].defaultProps,
    fields: sectionFields(type),
  };
}

export const puckConfig: Config = {
  components: Object.fromEntries(SECTION_TYPES.map((t) => [t, section(t)])),
  root: {
    // Root fields are drawn by the Site settings panel, not by Puck.
    fields: {},
    render: (props: Record<string, unknown>) => <EditorSite {...(props as unknown as React.ComponentProps<typeof EditorSite>)} />,
  },
};
