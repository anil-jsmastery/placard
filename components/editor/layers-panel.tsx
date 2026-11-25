"use client";

import { useGetPuck } from "@puckeditor/core";
import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, PanelBottom, PanelTop, type LucideIcon } from "lucide-react";
import { CATALOG } from "@/lib/sections/catalog";
import type { SectionType } from "@/lib/sections/schemas";
import type { SectionData } from "@/lib/site/types";
import { SECTION_ICONS } from "./icons";
import { ROOT_ZONE, scrollToSection, usePuck } from "./puck";

function FixedRow({ name, desc, Icon }: { name: string; desc: string; Icon: LucideIcon }) {
  return (
    <li className="lyr-row fixed">
      <span className="lyr-ic"><Icon /></span>
      <span className="lyr-tx"><b>{name}</b><small>{desc}</small></span>
      <span className="lyr-lock" title="Always shown"><Lock /></span>
    </li>
  );
}

// The page's sections from Puck's data: select, reorder and hide. Every change is one step in Puck's history.
export function LayersPanel() {
  const content = usePuck((s) => s.appState.data.content) as SectionData[];
  const selectedId = usePuck((s) => s.selectedItem?.props.id as string | undefined);
  const dispatch = usePuck((s) => s.dispatch);
  const getPuck = useGetPuck();
  const n = content.length;

  const selectorFor = (id: string | undefined) => {
    if (!id) return null;
    const index = getPuck().appState.data.content.findIndex((c) => c.props.id === id);
    return index < 0 ? null : { index, zone: ROOT_ZONE };
  };

  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= n) return;
    dispatch({ type: "reorder", sourceIndex: i, destinationIndex: j, destinationZone: ROOT_ZONE, recordHistory: false });
    dispatch({ type: "setUi", ui: { itemSelector: selectorFor(selectedId) }, recordHistory: true });
  };

  const toggle = (i: number) => {
    const s = content[i];
    const { hidden, ...rest } = s.props;
    const props = hidden ? rest : { ...rest, hidden: true };
    dispatch({ type: "replace", destinationIndex: i, destinationZone: ROOT_ZONE, data: { type: s.type, props }, recordHistory: false });
    const keep = hidden || s.props.id !== selectedId;
    dispatch({ type: "setUi", ui: { itemSelector: keep ? selectorFor(selectedId) : null }, recordHistory: true });
  };

  const select = (i: number) => {
    const s = content[i];
    if (s.props.hidden) return;
    if (s.props.id !== selectedId) dispatch({ type: "setUi", ui: { itemSelector: { index: i, zone: ROOT_ZONE } } });
    scrollToSection(s.props.id);
  };

  return (
    <ul className="panel-list" id="edLayers">
      <li className="lyr-head"><b>Page sections</b>Click a section to select it. Reorder with the arrows, and hide anything you don’t need. Hidden sections keep their content.</li>
      <FixedRow name="Navigation" desc="Your name, links and availability" Icon={PanelTop} />
      {n ? content.map((s, i) => {
        const meta = CATALOG[s.type as SectionType];
        const Icon = SECTION_ICONS[s.type as SectionType];
        const off = !!s.props.hidden;
        const p = s.props as { heading?: string; headline?: string };
        const cls = ["lyr-row", off && "off", selectedId === s.props.id && "sel"].filter(Boolean).join(" ");
        return (
          <li
            key={s.props.id}
            className={cls}
            tabIndex={0}
            onClick={() => select(i)}
            onKeyDown={(e) => {
              if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                select(i);
              }
            }}
          >
            <span className="lyr-ic"><Icon /></span>
            <span className="lyr-tx">
              <b>{meta.label}{off && <span className="lyr-pill">Hidden</span>}</b>
              <small>{p.heading || p.headline || meta.desc}</small>
            </span>
            <span className="lyr-acts">
              <button type="button" className="lyr-btn mv" aria-label={`Move ${meta.label} up`} title="Move up" disabled={i === 0}
                onClick={(e) => { e.stopPropagation(); move(i, -1); }}><ChevronUp /></button>
              <button type="button" className="lyr-btn mv" aria-label={`Move ${meta.label} down`} title="Move down" disabled={i === n - 1}
                onClick={(e) => { e.stopPropagation(); move(i, 1); }}><ChevronDown /></button>
              <button type="button" className="lyr-btn eye-b" aria-label={`${off ? "Show" : "Hide"} ${meta.label}`} title={off ? "Show section" : "Hide section"}
                onClick={(e) => { e.stopPropagation(); toggle(i); }}>{off ? <EyeOff /> : <Eye />}</button>
            </span>
          </li>
        );
      }) : <li className="blk-note">No sections yet. Add some from the Add tab.</li>}
      <FixedRow name="Footer" desc="Copyright and badge" Icon={PanelBottom} />
    </ul>
  );
}
