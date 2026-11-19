"use client";

import { useEffect, useRef } from "react";
import { createUsePuck, useGetPuck } from "@puckeditor/core";
import { useEditor } from "./editor";

const usePuck = createUsePuck();

/** Focus is in a text input, textarea, select or editable text: shortcuts (except ⌘S) leave the keys alone. */
function isTyping(target: EventTarget | null) {
  // Events from the canvas iframe carry elements from its own window, so no `instanceof Element`.
  if (!target || (target as Node).nodeType !== 1) return false;
  const el = target as Element;
  if (el.closest("[contenteditable=''], [contenteditable='true']")) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag !== "INPUT") return false;
  const type = (el as HTMLInputElement).type;
  return !["checkbox", "radio", "button", "submit", "range", "color", "file"].includes(type);
}

/** The canvas iframe's document gets the same shortcuts (overrides.iframe calls this). */
let frameHandler: ((e: KeyboardEvent) => void) | null = null;
export function listenForShortcuts(doc: Document) {
  const onKeyDown = (e: KeyboardEvent) => frameHandler?.(e);
  doc.defaultView?.addEventListener("keydown", onKeyDown, true);
  return () => doc.defaultView?.removeEventListener("keydown", onKeyDown, true);
}

/**
 * Desktop keyboard shortcuts. Undo (⌘Z / Ctrl+Z) and redo (⇧⌘Z / Ctrl+Shift+Z / Ctrl+Y) are Puck's own
 * history hotkeys; while typing they're stopped here so the field's own undo runs instead.
 * ⌘S / Ctrl+S saves now (also while typing). Esc clears the selection.
 */
export function EditorShortcuts() {
  const getPuck = useGetPuck();
  const dispatch = usePuck((s) => s.dispatch);
  const { flushSave, building } = useEditor();
  const state = useRef({ getPuck, dispatch, flushSave, building });
  useEffect(() => {
    state.current = { getPuck, dispatch, flushSave, building };
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const { getPuck, dispatch, flushSave, building } = state.current;
      const mod = e.metaKey || e.ctrlKey;
      const typing = isTyping(e.target);

      if (mod && e.code === "KeyS") {
        e.preventDefault();
        if (!building) void flushSave(getPuck().appState.data);
        return;
      }
      if (mod && (e.code === "KeyZ" || e.code === "KeyY")) {
        // Puck listens on the document; stopping here keeps the field's own undo while typing.
        if (typing || building) e.stopPropagation();
        return;
      }
      if (e.key === "Escape" && !typing && !e.defaultPrevented) {
        // A dialog, sheet or menu closes on Esc by itself.
        if (document.querySelector("[role='dialog'], [role='menu'], [role='alertdialog']")) return;
        if (getPuck().appState.ui.itemSelector) {
          dispatch({ type: "setUi", ui: { itemSelector: null }, recordHistory: false });
        }
      }
    };
    frameHandler = onKeyDown;
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      if (frameHandler === onKeyDown) frameHandler = null;
    };
  }, []);

  return null;
}
