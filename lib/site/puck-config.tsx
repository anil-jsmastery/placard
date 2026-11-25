"use client";

import type { ComponentConfig, Config } from "@puckeditor/core";
import { SECTION_COMPONENTS } from "@/components/site/sections";
import { SiteShell } from "@/components/site/site-shell";
import { sectionFields } from "@/lib/editor/fields";
import { CATALOG } from "@/lib/sections/catalog";
import { SECTION_TYPES, type SectionType } from "@/lib/sections/schemas";
import type { PageData, SectionData } from "@/lib/site/types";

type RootProps = PageData["root"]["props"];

// What the editor passes to <Puck metadata>: the page's sections, for the navigation links and the empty state.
// root.render reads them from there, not from Puck's store, so it also renders outside <Puck> (the test).
export type EditorMetadata = { content?: SectionData[] };

// The editor's .site: Step 2's SiteShell around Puck's drop zone (the sections).
function EditorSite({ children, puck, ...r }: RootProps & { children: React.ReactNode; puck?: { metadata?: EditorMetadata } }) {
  const content = puck?.metadata?.content ?? [];
  const visible = content.filter((s) => !s.props.hidden);
  return (
    <SiteShell root={r} sections={visible}>
      {/* The drop zone stays at the same place in the tree, so it isn't remounted when the first section arrives. */}
      <div className={content.length === 0 ? "pf-empty" : undefined}>
        {content.length === 0 && <div><b>Your page is empty</b>Add sections from the Add tab, then press Prettify to style it.</div>}
        {children}
      </div>
    </SiteShell>
  );
}

function section<T extends SectionType>(type: T): ComponentConfig {
  const Component = SECTION_COMPONENTS[type] as React.ComponentType<{ props: unknown }>;
  return {
    label: CATALOG[type].label,
    defaultProps: CATALOG[type].defaultProps,
    fields: sectionFields(type),
    // Puck adds `puck` and `editMode` to the props; the section components only read their own keys.
    render: (props) => (props.hidden ? <></> : <Component props={props} />),
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
