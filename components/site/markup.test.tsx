import { readFileSync } from "node:fs";
import vm from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { REFERENCE_PAGE, SAMPLE_PAGES } from "@/lib/site/sample-pages";
import type { PageData } from "@/lib/site/types";
import { SiteRoot } from "./site-root";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

// The reference renderer, screens/site-render.js, run in a sandbox.
const sandbox: { window: { renderSite?: (page: unknown) => string } } = { window: {} };
vm.runInNewContext(readFileSync(new URL("../../screens/site-render.js", import.meta.url), "utf8"), sandbox);
const renderSite = sandbox.window.renderSite!;

// Every class attribute in document order (whitespace normalised, empty ones dropped).
const classes = (html: string) =>
  [...html.matchAll(/class="([^"]*)"/g)].map((m) => m[1].trim().replace(/\s+/g, " ")).filter(Boolean);

const pages: Record<string, PageData> = { reference: REFERENCE_PAGE, ...SAMPLE_PAGES };

describe("site components match screens/site-render.js", () => {
  it.each(Object.entries(pages))("%s", (_name, page) => {
    // renderSite returns what goes inside the .site element (mountSite adds the class to its container).
    const expected = ["site", ...classes(renderSite(page))];
    const actual = classes(renderToStaticMarkup(<SiteRoot page={page} />));
    expect(actual).toEqual(expected);
  });
});
