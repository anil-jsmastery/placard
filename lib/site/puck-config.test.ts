import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SECTION_SCHEMAS, SECTION_TYPES } from "@/lib/sections/schemas";
import { puckConfig } from "./puck-config";
import { REFERENCE_PAGE } from "./sample-pages";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }),
}));

describe("puck config", () => {
  it.each(SECTION_TYPES)("%s fields match its schema", (type) => {
    const fields = Object.keys(puckConfig.components[type].fields ?? {}).sort();
    const schema = Object.keys(SECTION_SCHEMAS[type].shape).filter((k) => k !== "id" && k !== "hidden").sort();
    expect(fields).toEqual(schema);
  });

  it("root.render wraps the sections in the one .site: nav, the section, footer", () => {
    const root = REFERENCE_PAGE.root.props;
    const section = createElement("section", { className: "pf-sec test-section" });
    const render = puckConfig.root!.render! as (props: Record<string, unknown>) => React.ReactElement;
    const html = renderToStaticMarkup(render({ ...root, children: section, puck: { metadata: { content: REFERENCE_PAGE.content.filter((s) => !s.props.hidden) } } }));
    expect(html.startsWith(`<div class="site" data-theme="${root.theme}" data-font="${root.font}" data-spacing="${root.spacing}">`)).toBe(true);
    expect(html.match(/class="site"/g)).toHaveLength(1);
    const at = (needle: string) => html.indexOf(needle);
    expect(at('class="pf-nav"')).toBeGreaterThan(0);
    expect(at("test-section")).toBeGreaterThan(at('class="pf-nav"'));
    expect(at('class="pf-foot"')).toBeGreaterThan(at("test-section"));
    expect(html.endsWith("</div>")).toBe(true);
  });
});
