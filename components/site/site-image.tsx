"use client";

import { createContext, useContext } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type SiteImageOptionsValue = { sizes?: string; preload?: boolean };

const SiteImageOptionsContext = createContext<SiteImageOptionsValue>({});

/**
 * For a site shown scaled down inside a `SiteFrame` (the landing page): `sizes` matches the frame's rendered
 * width, and `preload={false}` stops the Hero photo from being preloaded.
 */
export function SiteImageOptions({ sizes, preload, children }: SiteImageOptionsValue & { children: React.ReactNode }) {
  return <SiteImageOptionsContext.Provider value={{ sizes, preload }}>{children}</SiteImageOptionsContext.Provider>;
}

type SiteImageProps = {
  image: { src: string; alt: string };
  /** Aspect ratio of the box, as in the reference (e.g. "aspect-[4/3]"). */
  className?: string;
  /** A round 40 px avatar instead of a theme-rounded photo box. */
  avatar?: boolean;
  /** The page's largest image above the fold (the Hero photo): fetched from <head> instead of lazily. */
  preload?: boolean;
};

/** A library or uploaded photo in the reference's aspect-ratio box. */
export function SiteImage({ image, className, avatar = false, preload = false }: SiteImageProps) {
  const options = useContext(SiteImageOptionsContext);
  return (
    <div
      className={cn(
        "relative overflow-hidden bg-site-border",
        avatar ? "size-10 shrink-0 rounded-full" : "rounded-site",
        className,
      )}
    >
      <Image
        src={image.src}
        alt={image.alt}
        fill
        preload={options.preload ?? preload}
        sizes={avatar ? "40px" : (options.sizes ?? "(min-width: 1024px) 50vw, 100vw")}
        className="object-cover"
      />
    </div>
  );
}
