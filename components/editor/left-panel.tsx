"use client";

import { useState } from "react";
import { Layers, Plus, Sparkle } from "lucide-react";
import { AddPanel } from "./add-panel";
import { AiPanel } from "./ai-panel";
import { LayersPanel } from "./layers-panel";

type Tab = "ai" | "add" | "layers";

// aside.chat with the AI (first, default), Add and Layers tabs. While the AI runs, Add and Layers are disabled.
export function LeftPanel({ ai }: { ai: React.ComponentProps<typeof AiPanel> }) {
  const [tab, setTab] = useState<Tab>("ai");
  const current: Tab = ai.running ? "ai" : tab;
  return (
    <aside className="chat">
      <div className="chat-head">
        <div className="seg" role="tablist" aria-label="Editor tools">
          <button type="button" role="tab" aria-selected={current === "ai"} onClick={() => setTab("ai")}>
            <Sparkle fill="currentColor" strokeWidth={0} />AI
          </button>
          <button type="button" role="tab" aria-selected={current === "add"} disabled={ai.running} onClick={() => setTab("add")}>
            <Plus strokeWidth={1.7} />Add
          </button>
          <button type="button" role="tab" aria-selected={current === "layers"} disabled={ai.running} onClick={() => setTab("layers")}>
            <Layers />Layers
          </button>
        </div>
      </div>
      {/* The AI tab stays mounted so a run keeps going while another tab is open. */}
      <div style={{ display: current === "ai" ? "contents" : "none" }}>
        <AiPanel {...ai} />
      </div>
      {current === "add" && <AddPanel />}
      {current === "layers" && <LayersPanel />}
    </aside>
  );
}
