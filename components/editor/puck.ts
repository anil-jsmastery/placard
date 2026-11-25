"use client";

import { createUsePuck, type Config } from "@puckeditor/core";

// Typed selector hook for everything inside <Puck>.
export const usePuck = createUsePuck<Config>();

// Puck's one drop zone: the page's sections.
export const ROOT_ZONE = "root:default-zone";

export const newSectionId = (type: string) => `${type.toLowerCase()}-${Math.random().toString(36).slice(2, 9)}`;

// The canvas is an iframe; find a section's element in it and bring it into view.
export function scrollToSection(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const run = (tries: number) => {
    const doc = document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument;
    const el = doc?.querySelector(`[data-puck-component="${CSS.escape(id)}"]`);
    if (el) el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    else if (tries > 0) requestAnimationFrame(() => run(tries - 1));
  };
  requestAnimationFrame(() => run(10));
}

// A section the AI just added fades up (the prototype's .shown: opacity and 10px, .45 s) and comes into view.
export function revealSection(id: string) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const run = (tries: number) => {
    const doc = document.querySelector<HTMLIFrameElement>("#preview-frame")?.contentDocument;
    const el = doc?.querySelector<HTMLElement>(`[data-puck-component="${CSS.escape(id)}"]`);
    if (!el) {
      if (tries > 0) requestAnimationFrame(() => run(tries - 1));
      return;
    }
    if (!reduce) {
      el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: "ease" });
    }
    el.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  };
  requestAnimationFrame(() => run(10));
}
