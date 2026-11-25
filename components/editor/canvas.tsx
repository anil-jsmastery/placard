"use client";

import { useEffect } from "react";
import { Puck } from "@puckeditor/core";
import type { TAB_ICONS } from "@/lib/sections/schemas";
import { TAB_ICON_COMPONENTS } from "./icons";
import { usePuck } from "./puck";
import type { Device } from "./top-bar";

// overrides.iframe: the canvas iframe gets the page's font variables (set on <html> by app/fonts.ts),
// and grows to the portfolio's height so the canvas scrolls like the prototype's frame.
export function CanvasFrame({ children, document: doc }: { children: React.ReactNode; document?: Document }) {
  useEffect(() => {
    if (!doc) return;
    doc.documentElement.classList.add(...window.document.documentElement.classList);
    const frame = doc.defaultView?.frameElement as HTMLElement | null;
    let observed: Element | null = null;
    const ro = new ResizeObserver(() => fit());
    function fit() {
      const site = doc!.querySelector(".site");
      if (site !== observed) {
        if (observed) ro.unobserve(observed);
        if (site) ro.observe(site);
        observed = site;
      }
      if (frame && site) frame.style.height = `${Math.ceil(site.getBoundingClientRect().height)}px`;
    }
    const mo = new MutationObserver(fit);
    mo.observe(doc.body, { childList: true, subtree: true });
    fit();
    // After a click on a section the iframe has focus: hand its shortcuts (undo, redo, save, Esc) to the editor.
    const forward = (e: KeyboardEvent) => {
      const copy = new KeyboardEvent("keydown", {
        key: e.key, code: e.code, metaKey: e.metaKey, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, cancelable: true,
      });
      if (!window.dispatchEvent(copy)) e.preventDefault();
    };
    doc.addEventListener("keydown", forward);
    return () => {
      ro.disconnect();
      mo.disconnect();
      doc.removeEventListener("keydown", forward);
    };
  }, [doc]);
  return <>{children}</>;
}

// While Prettify runs the canvas gets .prettifying, on the portfolio's .site inside the iframe (the prototype's
// .site.prettifying) as well as on .canvas.
export function Canvas({ device, prettifying = false }: { device: Device; prettifying?: boolean }) {
  useEffect(() => {
    const doc = document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument;
    const site = doc?.querySelector(".site");
    site?.classList.toggle("prettifying", prettifying);
    return () => site?.classList.remove("prettifying");
  }, [prettifying]);
  const title = usePuck((s) => s.appState.data.root.props?.title as string | undefined);
  const favicon = usePuck((s) => s.appState.data.root.props?.favicon as (typeof TAB_ICONS)[number] | undefined);
  const Icon = TAB_ICON_COMPONENTS[favicon ?? "sparkles"] ?? TAB_ICON_COMPONENTS.sparkles;
  return (
    <div className={prettifying ? "canvas prettifying" : "canvas"}>
      <div className="frame" id="edFrame" data-device={device}>
        <div className="frame-bar">
          <span className="lights"><b /><b /><b /></span>
          <span className="frame-tab"><span className="tab-ic"><Icon /></span> <span>{title || "Untitled portfolio"}</span></span>
          {/* Step 6 shows the address once the portfolio has one. */}
          <span className="frame-url">Draft</span>
        </div>
        <Puck.Preview />
      </div>
    </div>
  );
}
