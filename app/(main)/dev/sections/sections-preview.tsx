"use client";

import { useMemo, useState } from "react";
import { SiteRoot } from "@/components/site/site-root";
import { FONTS, THEMES, type SectionType } from "@/lib/sections/schemas";
import { FONT_META, THEME_META } from "@/lib/site/themes";
import type { PageData, SectionData } from "@/lib/site/types";
import { cn } from "@/lib/utils";

type Option = { value: string; label: React.ReactNode };

function Group({ label, options, value, onChange }: { label: string; options: Option[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="seg flex-wrap">
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const layoutOf = (page: PageData, type: SectionData["type"], fallback: string) => {
  const s = page.content.find((c) => c.type === type);
  return s && "layout" in s.props && s.props.layout ? s.props.layout : fallback;
};

export function SectionsPreview({ page }: { page: PageData }) {
  const r = page.root.props;
  const [theme, setTheme] = useState<string>(r.theme);
  const [font, setFont] = useState<string>(r.font);
  const [intro, setIntro] = useState(layoutOf(page, "Intro", "statement"));
  const [work, setWork] = useState(layoutOf(page, "Work", "grid"));
  const [gal, setGal] = useState(layoutOf(page, "Gallery", "grid"));
  const [width, setWidth] = useState("1280");
  const [names, setNames] = useState("false");

  // The bar changes the first Intro, Work and Gallery, like site-sections.html.
  const shown = useMemo<PageData>(() => {
    const layouts: Partial<Record<SectionData["type"], string>> = { Intro: intro, Work: work, Gallery: gal };
    const seen = new Set<string>();
    const content = page.content.map((s) => {
      const layout = layouts[s.type];
      if (!layout || seen.has(s.type)) return s;
      seen.add(s.type);
      return { ...s, props: { ...s.props, layout } } as SectionData;
    });
    return { ...page, root: { props: { ...r, theme: theme as PageData["root"]["props"]["theme"], font: font as PageData["root"]["props"]["font"] } }, content };
  }, [page, r, theme, font, intro, work, gal]);

  const wrap = (type: SectionType, node: React.ReactNode) => (
    <div className="relative" data-type={type}>
      {names === "true" && (
        <span className="absolute left-2 -top-2.5 z-[2] rounded-[5px] bg-foreground px-[7px] py-0.5 font-mono text-[11px] font-medium text-background">
          {type}
        </span>
      )}
      {node}
    </div>
  );

  return (
    <div className="min-h-dvh bg-secondary">
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-x-[22px] gap-y-2.5 border-b border-border bg-background px-5 py-3">
        <b className="font-semibold">Portfolio sections</b>
        <Group
          label="Theme"
          value={theme}
          onChange={setTheme}
          options={THEMES.map((t) => ({
            value: t,
            label: (
              <>
                <i
                  className="inline-block size-3.5 rounded-full ring-1 ring-inset ring-border"
                  style={{ background: `linear-gradient(135deg,${THEME_META[t].bg} 50%,${THEME_META[t].acc} 50%)` }}
                />
                {THEME_META[t].name}
              </>
            ),
          }))}
        />
        <Group label="Font" value={font} onChange={setFont} options={FONTS.map((f) => ({ value: f, label: FONT_META[f].name }))} />
        <Group label="Intro" value={intro} onChange={setIntro} options={[{ value: "statement", label: "Statement" }, { value: "split", label: "Split" }]} />
        <Group label="Work" value={work} onChange={setWork} options={[{ value: "grid", label: "Grid" }, { value: "list", label: "List" }]} />
        <Group label="Gallery" value={gal} onChange={setGal} options={[{ value: "mosaic", label: "Mosaic" }, { value: "grid", label: "Grid" }]} />
        <Group label="Width" value={width} onChange={setWidth} options={[{ value: "1280", label: "Desktop" }, { value: "390", label: "Phone" }]} />
        <Group label="Labels" value={names} onChange={setNames} options={[{ value: "false", label: "Off" }, { value: "true", label: "On" }]} />
      </div>
      <div className="grid justify-items-center px-5 pt-7 pb-15">
        <div className={cn("w-full min-w-0 overflow-hidden rounded-[14px] border border-border transition-[max-width] duration-300", width === "390" ? "max-w-[390px]" : "max-w-[1280px]")}>
          <SiteRoot page={shown} wrap={wrap} />
        </div>
      </div>
    </div>
  );
}
