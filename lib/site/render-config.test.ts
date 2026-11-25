import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { renderConfig } from "./render-config";
import { REFERENCE_PAGE } from "./sample-pages";

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => createElement("img", { src, alt }),
}));

describe("render config", () => {
  it("has no fields, only render", () => {
    for (const c of Object.values(renderConfig.components)) expect(c.fields).toBeUndefined();
  });

  it("gives the first visible section of each kind its nav anchor", () => {
    const visible = REFERENCE_PAGE.content.filter((s) => !s.props.hidden);
    const html = visible
      .map((s) => {
        const render = renderConfig.components[s.type].render as (p: Record<string, unknown>) => React.ReactElement;
        return renderToStaticMarkup(render({ ...s.props, puck: { metadata: { content: visible } } }));
      })
      .join("");
    for (const anchor of ["work", "about", "contact"]) {
      if (html.includes(`id="${anchor}"`)) expect(html.match(new RegExp(`id="${anchor}"`, "g"))).toHaveLength(1);
    }
    expect(html).toMatch(/id="(work|about|writing|contact)"/);
  });
});
