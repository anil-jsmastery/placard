"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { PageData } from "@/lib/site/types";
import { SiteRoot } from "./site-root";

const WIDTH = 1100;

// Renders a portfolio at 1100 px and scales it to its box (.thumb, .ex-thumb, .aa-view).
export function SiteFrame({ page, interactive = false, className }: { page: PageData; interactive?: boolean; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale((el.clientWidth || 340) / WIDTH);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={box} className={cn("min-w-0", className)}>
      <div
        className="tin"
        style={{ transform: `scale(${scale})`, visibility: scale ? undefined : "hidden" }}
        inert={!interactive || undefined}
        aria-hidden={!interactive || undefined}
      >
        <SiteRoot page={page} />
      </div>
    </div>
  );
}
