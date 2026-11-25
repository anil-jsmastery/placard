"use client";

import { Puck } from "@puckeditor/core";
import { ChevronLeft, Settings2 } from "lucide-react";
import { CATALOG } from "@/lib/sections/catalog";
import { FONTS, TAB_ICONS, THEMES, type SectionType } from "@/lib/sections/schemas";
import { FONT_META, THEME_META } from "@/lib/site/themes";
import type { PageData } from "@/lib/site/types";
import { SECTION_ICONS, TAB_ICON_COMPONENTS } from "./icons";
import { usePuck } from "./puck";

type RootProps = PageData["root"]["props"];
type TabIcon = (typeof TAB_ICONS)[number];

// The prototype's #edRoot: root.props read and written through Puck (replaceRoot, so it's in the history).
function SiteSettings() {
  const root = usePuck((s) => s.appState.data.root);
  const dispatch = usePuck((s) => s.dispatch);
  const r = (root.props ?? {}) as RootProps;
  const set = <K extends keyof RootProps>(key: K, value: RootProps[K]) => {
    if (r[key] === value) return;
    dispatch({ type: "replaceRoot", root: { ...root, props: { ...r, [key]: value } } });
  };
  const icons = [...new Set<TabIcon>([r.favicon, ...TAB_ICONS])].slice(0, 6);
  const description = r.description ?? "";

  return (
    <div id="edRoot">
      <h4>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Settings2 style={{ width: 16, height: 16, color: "var(--mute)" }} />Site settings
        </span>
      </h4>
      <div className="field">
        <label htmlFor="edTitle">Site title</label>
        <div className="box"><input type="text" id="edTitle" maxLength={60} value={r.title ?? ""} onChange={(e) => set("title", e.target.value)} /></div>
      </div>
      <div className="field">
        <label htmlFor="edAvail">Availability</label>
        <div className="box">
          <input type="text" id="edAvail" placeholder="Open to work" maxLength={40} value={r.availability ?? ""} onChange={(e) => set("availability", e.target.value)} />
        </div>
      </div>
      <div className="field">
        <span className="lbl">Theme</span>
        <div className="box">
          <div className="th-grid" id="edThemes">
            {THEMES.map((k) => {
              const t = THEME_META[k];
              return (
                <button key={k} type="button" className="th-btn" aria-pressed={r.theme === k} onClick={() => set("theme", k)}>
                  <span className="tile" style={{ background: t.bg, borderColor: k === "midnight" ? t.bg : undefined }}>
                    <i style={{ background: t.ink }} /><i style={{ background: t.acc }} />
                  </span>
                  {t.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="field">
        <span className="lbl">Heading font</span>
        <div className="box" style={{ padding: 6 }}>
          <div className="font-seg" role="group" aria-label="Heading font" id="edFonts">
            {FONTS.map((k) => (
              <button key={k} type="button" aria-pressed={r.font === k} onClick={() => set("font", k)}>
                <b style={{ fontFamily: FONT_META[k].variable, fontWeight: FONT_META[k].weight }}>Aa</b>{FONT_META[k].name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="field">
        <span className="lbl">Tab icon</span>
        <div className="box">
          <div className="em-row" id="edEmojis">
            {icons.map((k) => {
              const Icon = TAB_ICON_COMPONENTS[k];
              const label = k.replace("-", " ");
              return (
                <button key={k} type="button" aria-pressed={r.favicon === k} aria-label={`Tab icon: ${label}`} title={label} onClick={() => set("favicon", k)}>
                  <Icon />
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="edSeo">Search description</label>
        <div className="box">
          <textarea id="edSeo" maxLength={160} value={description} onChange={(e) => set("description", e.target.value)} />
          <div className="count">{description.length} / 160</div>
        </div>
      </div>
    </div>
  );
}

// aside.settings: Site settings with nothing selected, else the selected section's fields. Disabled while the AI runs.
export function FieldsPanel({ disabled }: { disabled: boolean }) {
  const type = usePuck((s) => s.selectedItem?.type as SectionType | undefined);
  const dispatch = usePuck((s) => s.dispatch);

  if (!type) {
    return (
      <aside className="settings" aria-label="Site settings">
        <fieldset disabled={disabled} style={{ display: "contents" }}><SiteSettings /></fieldset>
      </aside>
    );
  }
  const Icon = SECTION_ICONS[type];
  return (
    <aside className="settings" aria-label={`${CATALOG[type].label} fields`}>
      <div id="edFields">
        <div className="f-head">
          <button type="button" className="icon-btn sm" aria-label="Back to site settings" title="Site settings"
            onClick={() => dispatch({ type: "setUi", ui: { itemSelector: null } })}>
            <ChevronLeft />
          </button>
          <b>{CATALOG[type].label}</b>
          <span className="lyr-ic"><Icon /></span>
        </div>
        <p className="f-note">Changes here are free. Press Prettify to restyle; it never changes these words.</p>
        <fieldset disabled={disabled} style={{ display: "contents" }}><Puck.Fields wrapFields={false} /></fieldset>
      </div>
    </aside>
  );
}
