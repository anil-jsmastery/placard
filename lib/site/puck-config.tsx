"use client";

import { createUsePuck, type ComponentConfig, type Config } from "@puckeditor/core";
import { SECTION_COMPONENTS } from "@/components/site/sections";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNav } from "@/components/site/site-nav";
import { sectionFields } from "@/lib/editor/fields";
import { CATALOG } from "@/lib/sections/catalog";
import { SECTION_TYPES, type SectionType } from "@/lib/sections/schemas";
import type { PageData, SectionData } from "@/lib/site/types";

const usePuck = createUsePuck();

type RootProps = PageData["root"]["props"];

// The editor's .site: SiteRoot's navigation and footer around Puck's drop zone (the sections).
function EditorSite({ children, ...r }: RootProps & { children: React.ReactNode }) {
  const content = usePuck((s) => s.appState.data.content) as SectionData[];
  const visible = content.filter((s) => !s.props.hidden);
  return (
    <div className="site" data-theme={r.theme} data-font={r.font} data-spacing={r.spacing}>
      <SiteNav title={r.title} availability={r.availability} sections={visible} />
      {/* The drop zone stays at the same place in the tree, so it isn't remounted when the first section arrives. */}
      <div className={content.length === 0 ? "pf-empty" : undefined}>
        {content.length === 0 && <div><b>Your page is empty</b>Add sections from the Add tab, then press Prettify to style it.</div>}
        {children}
      </div>
      <SiteFooter title={r.title} showBadge={r.showBadge} />
    </div>
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
    render: (props: Record<string, unknown>) => <EditorSite {...(props as unknown as RootProps & { children: React.ReactNode })} />,
  },
};
