import Image from "next/image";
import { cn } from "@/lib/utils";

type SiteImageProps = {
  image: { src: string; alt: string };
  /** Aspect ratio of the box, as in the reference (e.g. "aspect-[4/3]"). */
  className?: string;
  /** A round 40 px avatar instead of a theme-rounded photo box. */
  avatar?: boolean;
};

/** A library or uploaded photo in the reference's aspect-ratio box. */
export function SiteImage({ image, className, avatar = false }: SiteImageProps) {
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
        sizes={avatar ? "40px" : "(min-width: 1024px) 50vw, 100vw"}
        className="object-cover"
      />
    </div>
  );
}
