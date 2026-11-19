import { createElement, type ComponentProps, type ComponentType, type ReactNode } from "react";
import type { Config } from "@puckeditor/core";
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
import type { PageData, SectionProps } from "@/lib/site/types";
import { SECTION_TYPES, type SectionType } from "./schemas";

const COMPONENTS: { [T in SectionType]: ComponentType<SectionProps<T>> } = {
  Hero, About, Features, Services, Gallery, Testimonials, Pricing, FAQ, CallToAction, Contact, Links,
};

type RootProps = PageData["root"]["props"];

function sectionRender(type: SectionType) {
  const Component = COMPONENTS[type] as ComponentType<Record<string, unknown>>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return function SectionRender({ id, puck, editMode, ...props }: Record<string, unknown>) {
    return createElement(Component, props);
  };
}

/**
 * Server-safe Puck config: only `render` for each section and the root (no fields, no client imports).
 * Published pages render with this; `puck-config.tsx` spreads it and adds the editor's fields.
 */
export const renderConfig = {
  components: Object.fromEntries(SECTION_TYPES.map((t) => [t, { render: sectionRender(t) }])),
  root: {
    render: ({ children, ...props }: { children: ReactNode } & Partial<RootProps>) => {
      const { title, theme, font, showBadge } = props;
      const rootProps = {
        title: title ?? "",
        theme: theme ?? "paper",
        font: font ?? "sans",
        favicon: "",
        description: "",
        showBadge: showBadge ?? true,
        className: "min-h-screen",
      } as ComponentProps<typeof SiteRoot>;
      return createElement(SiteRoot, rootProps, children);
    },
  },
} satisfies Config;
