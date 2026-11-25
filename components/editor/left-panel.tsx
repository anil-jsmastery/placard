"use client";

import { useState } from "react";
import { Layers, Plus } from "lucide-react";
import { AddPanel } from "./add-panel";
import { LayersPanel } from "./layers-panel";

type Tab = "add" | "layers";

// aside.chat with the Add and Layers tabs (Step 4 adds AI as the first, default tab).
export function LeftPanel() {
  const [tab, setTab] = useState<Tab>("add");
  return (
    <aside className="chat">
      <div className="chat-head">
        <div className="seg" role="tablist" aria-label="Editor tools">
          <button type="button" role="tab" aria-selected={tab === "add"} onClick={() => setTab("add")}><Plus strokeWidth={1.7} />Add</button>
          <button type="button" role="tab" aria-selected={tab === "layers"} onClick={() => setTab("layers")}><Layers />Layers</button>
        </div>
      </div>
      {tab === "add" ? <AddPanel /> : <LayersPanel />}
    </aside>
  );
}
