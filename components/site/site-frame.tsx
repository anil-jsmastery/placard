"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SiteFrameProps = {
  children: React.ReactNode;
  /** Design width the site renders at before scaling. */
  width?: number;
  /** Set the box height to the scaled content height. */
  fitHeight?: boolean;
  /** false: the preview can't be clicked or focused and is hidden from screen readers. */
  interactive?: boolean;
  className?: string;
};

/** Renders a site at a fixed design width and scales it down (or up) to fit its box. */
export function SiteFrame({ children, width = 1280, fitHeight = false, interactive = true, className }: SiteFrameProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const s = outer.clientWidth / width;
      setScale(s);
      if (fitHeight) setHeight(inner.offsetHeight * s);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [width, fitHeight]);

  return (
    <div
      ref={outerRef}
      className={cn("relative min-w-0 overflow-hidden", className)}
      style={fitHeight ? { height } : undefined}
    >
      <div
        ref={innerRef}
        inert={!interactive || undefined}
        aria-hidden={!interactive || undefined}
        style={{ width, transform: `scale(${scale})`, transformOrigin: "top left", visibility: scale ? undefined : "hidden" }}
      >
        {children}
      </div>
    </div>
  );
}
