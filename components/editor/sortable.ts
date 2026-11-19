"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Drag = { from: number; to: number };

/**
 * Drag-to-reorder for a vertical list, with a handle that works with a mouse, a finger
 * (pointer events, `touch-action: none`) and the keyboard (arrow keys move the item).
 * `onMove(from, to)` gets the item's final index. `list` is the current list: when it changes
 * during a drag (undo, an AI edit), the drag is dropped instead of moving a stale index.
 */
export function useSortable(count: number, onMove: (from: number, to: number) => void, list?: unknown) {
  const rows = useRef<(HTMLElement | null)[]>([]);
  const dragRef = useRef<Drag | null>(null);
  const listRef = useRef(list);
  const dragList = useRef<unknown>(undefined);
  useEffect(() => {
    listRef.current = list;
  });
  const [drag, setDrag] = useState<Drag | null>(null);

  const update = (next: Drag | null) => {
    dragRef.current = next;
    setDrag(next);
  };

  const targetFor = (from: number, y: number) => {
    let to = 0;
    rows.current.slice(0, count).forEach((row, i) => {
      if (!row || i === from) return;
      const rect = row.getBoundingClientRect();
      if (y > rect.top + rect.height / 2) to++;
    });
    return to;
  };

  const rowRef = useCallback(
    (index: number) => (el: HTMLElement | null) => {
      rows.current[index] = el;
    },
    [],
  );

  const handleProps = (index: number) => ({
    style: { touchAction: "none" } as const,
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragList.current = listRef.current;
      update({ from: index, to: index });
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      const current = dragRef.current;
      if (!current) return;
      const to = targetFor(current.from, e.clientY);
      if (to !== current.to) update({ from: current.from, to });
    },
    onPointerUp: () => {
      const current = dragRef.current;
      update(null);
      if (dragList.current !== listRef.current) return;
      if (current && current.to !== current.from) onMove(current.from, current.to);
    },
    onPointerCancel: () => update(null),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "ArrowUp" && index > 0) {
        e.preventDefault();
        onMove(index, index - 1);
      } else if (e.key === "ArrowDown" && index < count - 1) {
        e.preventDefault();
        onMove(index, index + 1);
      }
    },
  });

  /** Where the drop line shows for this row while dragging. */
  const dropAt = (index: number): "before" | "after" | null => {
    if (!drag || drag.to === drag.from) return null;
    if (drag.to < drag.from) return index === drag.to ? "before" : null;
    return index === drag.to ? "after" : null;
  };

  return { rowRef, handleProps, dropAt, dragging: drag?.from ?? null };
}

/** `list` with the item at `from` moved to `to`. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
