"use client";

import Link from "next/link";
import { ArrowLeft, Check, Monitor, Redo2, Smartphone, Tablet, Undo2 } from "lucide-react";
import { Status } from "@/components/app/status";
import { PrettifyButton } from "./prettify-button";
import { usePuck } from "./puck";

export type Device = "desktop" | "tablet" | "mobile";
export type SaveState =
  | { kind: "saved" }
  | { kind: "saving" }
  | { kind: "invalid"; message: string; path: string }
  | { kind: "retrying" };

const DEVICES = [
  { key: "desktop", label: "Desktop", Icon: Monitor },
  { key: "tablet", label: "Tablet", Icon: Tablet },
  { key: "mobile", label: "Mobile", Icon: Smartphone },
] as const;

function Saved({ state }: { state: SaveState }) {
  if (state.kind === "saving") return <span className="saved" role="status">Saving…</span>;
  if (state.kind === "retrying") return <span className="saved" role="status">Couldn&apos;t save. Retrying…</span>;
  if (state.kind === "invalid") {
    return (
      <span className="saved" role="status" style={{ color: "var(--destructive)" }}>
        Can&apos;t save: {state.message} ({state.path})
      </span>
    );
  }
  return <span className="saved" role="status"><Check strokeWidth={2} />Saved</span>;
}

export function TopBar({
  live, save, device, onDevice, locked, prettifying, onPrettify, publishing, onPublish,
}: {
  live: boolean;
  save: SaveState;
  device: Device;
  onDevice: (d: Device) => void;
  locked: boolean;
  prettifying: boolean;
  onPrettify: () => void;
  publishing: boolean;
  onPublish: () => void;
}) {
  const title = usePuck((s) => s.appState.data.root.props?.title as string | undefined);
  const hasPast = usePuck((s) => s.history.hasPast);
  const hasFuture = usePuck((s) => s.history.hasFuture);
  const back = usePuck((s) => s.history.back);
  const forward = usePuck((s) => s.history.forward);

  return (
    <div className="ed-top">
      <div className="ed-l">
        <Link className="icon-btn" href="/sites" aria-label="Back to sites" style={{ border: "1px solid var(--line)" }}>
          <ArrowLeft />
        </Link>
        <span className="t">{title || "Untitled portfolio"}</span>
        <Status live={live}>{live ? "Live" : "Draft"}</Status>
        <span className="vr" />
        <Saved state={save} />
      </div>
      <div className="seg" role="group" aria-label="Preview size" id="edDevices">
        {DEVICES.map(({ key, label, Icon }) => (
          <button key={key} type="button" aria-pressed={device === key} aria-label={label} onClick={() => onDevice(key)}>
            <Icon />
          </button>
        ))}
      </div>
      <div className="ed-r">
        <button type="button" className="icon-btn" id="edUndo" aria-label="Undo" disabled={locked || !hasPast} onClick={back}><Undo2 /></button>
        <button type="button" className="icon-btn" id="edRedo" aria-label="Redo" disabled={locked || !hasFuture} onClick={forward}><Redo2 /></button>
        <PrettifyButton running={prettifying} disabled={locked} onClick={onPrettify} />
        {/* Enabled when no AI run is going and the last save went through. */}
        <button
          type="button"
          className="btn btn-sm btn-blue"
          id="edPublish"
          disabled={locked || publishing || save.kind === "invalid" || save.kind === "retrying"}
          onClick={onPublish}
        >
          {publishing ? (live ? "Updating…" : "Publishing…") : live ? "Update site" : "Publish"}
        </button>
      </div>
    </div>
  );
}
