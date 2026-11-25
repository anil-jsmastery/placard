"use client";

import { WandSparkles } from "lucide-react";

// The top bar's Prettify: restyles the page without changing a word. `.run` and "Prettifying…" while it works;
// disabled while another AI run is going.
export function PrettifyButton({ running, disabled, onClick }: { running: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={running ? "btn btn-sm btn-soft btn-pretty run" : "btn btn-sm btn-soft btn-pretty"}
      title="Restyle the page with AI. Your words stay the same."
      disabled={disabled && !running}
      aria-busy={running}
      onClick={onClick}
    >
      <WandSparkles />{running ? "Prettifying…" : "Prettify"}
    </button>
  );
}
