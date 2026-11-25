"use client";

import { Puck, useGetPuck } from "@puckeditor/core";
import { GripVertical, Plus } from "lucide-react";
import { CATALOG } from "@/lib/sections/catalog";
import type { SectionType } from "@/lib/sections/schemas";
import { SECTION_ICONS } from "./icons";
import { newSectionId, ROOT_ZONE, scrollToSection, usePuck } from "./puck";

// Where a click puts a section: Intro first, Contact last, everything else above the first Contact.
function insertIndex(types: string[], type: SectionType) {
  const contact = types.indexOf("Contact");
  if (type === "Intro") return 0;
  if (type === "Contact" || contact < 0) return types.length;
  return contact;
}

// overrides.drawerItem: each section in the Add tab as the prototype's .blk card. Puck makes it draggable.
export function DrawerItem({ name }: { name: string }) {
  const type = name as SectionType;
  const count = usePuck((s) => s.appState.data.content.filter((c) => c.type === type).length);
  const getPuck = useGetPuck();
  const dispatch = usePuck((s) => s.dispatch);
  const meta = CATALOG[type];
  const Icon = SECTION_ICONS[type];

  const add = () => {
    const index = insertIndex(getPuck().appState.data.content.map((c) => c.type as string), type);
    const id = newSectionId(type);
    dispatch({ type: "insert", componentType: type, destinationIndex: index, destinationZone: ROOT_ZONE, id, recordHistory: false });
    dispatch({ type: "setUi", ui: { itemSelector: { index, zone: ROOT_ZONE } }, recordHistory: true });
    scrollToSection(id);
  };

  return (
    <button type="button" className="blk" onClick={add}>
      <span className="grip"><GripVertical /></span>
      <span className="lyr-ic"><Icon /></span>
      <span className="lyr-tx">
        <b>{meta.label}{count > 0 && <span className="blk-count"> · {count} on page</span>}</b>
        <small>{meta.desc}</small>
      </span>
      <span className="blk-st"><Plus />Add</span>
    </button>
  );
}

// Puck.Components draws one DrawerItem per component, in the config's (the catalog's) order.
export function AddPanel() {
  return (
    <ul className="panel-list" id="edAdd">
      <li className="lyr-head"><b>Add a section</b>Drag one onto the page, or click Add to put it above Contact. Adding by hand is free.</li>
      <li><Puck.Components /></li>
      <li className="blk-note">New sections start plain. Press Prettify when you’re ready and I’ll style the whole page.</li>
    </ul>
  );
}
