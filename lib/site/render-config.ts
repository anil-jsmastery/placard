import { createElement, Fragment } from "react";
import type { ComponentConfig, Config } from "@puckeditor/core";
import { NAV_LINK } from "@/components/site/anchors";
import { SECTION_COMPONENTS } from "@/components/site/sections";
import { SiteShell } from "@/components/site/site-shell";
import { SECTION_TYPES, type SectionType } from "@/lib/sections/schemas";
import type { PageData, SectionData } from "@/lib/site/types";

type RootProps = PageData["root"]["props"];

// What <Render metadata> / <Puck metadata> carry: the page's visible sections (no hidden ones), for the nav links,
// the anchors and the editor's empty state.
export type SiteMetadata = { content?: SectionData[] };
type PuckProp = { puck?: { metadata?: SiteMetadata } };

// The first visible section of each kind gets the id its nav link points at, the same way SiteRoot does it.
export function anchorFor(type: SectionType, id: string, visible: SectionData[]): string | undefined {
  const anchor = NAV_LINK[type]?.anchor;
  if (!anchor) return undefined;
  const first = visible.find((s) => NAV_LINK[s.type]?.anchor === anchor);
  return first?.props.id === id ? anchor : undefined;
}

function section<T extends SectionType>(type: T): ComponentConfig {
  const Component = SECTION_COMPONENTS[type] as React.ComponentType<{ props: unknown; anchor?: string }>;
  return {
    // Puck adds `puck` and `editMode` to the props; the section components only read their own keys.
    render: (props) => {
      if (props.hidden) return createElement(Fragment);
      const visible = (props as PuckProp).puck?.metadata?.content ?? [];
      return createElement(Component, { props, anchor: anchorFor(type, String(props.id), visible) });
    },
  };
}

export const sectionComponents: Config["components"] = Object.fromEntries(SECTION_TYPES.map((t) => [t, section(t)]));

// Published pages: Step 2's SiteShell with the sections directly inside it (site-render.js's markup), no fields.
export const renderConfig: Config = {
  components: sectionComponents,
  root: {
    render: ({ children, puck, ...r }: Record<string, unknown> & PuckProp & { children?: React.ReactNode }) =>
      createElement(SiteShell, { root: r as unknown as RootProps, sections: puck?.metadata?.content ?? [] }, children),
  },
};
