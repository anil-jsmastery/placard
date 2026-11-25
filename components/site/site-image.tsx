import Image from "next/image";

type Img = { src: string; alt: string };

// A photo in its pf-img box; site.css sizes the box.
export function SiteImage({ image, className }: { image: Img; className?: string }) {
  return (
    <div className={className ? `pf-img ${className}` : "pf-img"}>
      <Image src={image.src} alt={image.alt} fill sizes="(min-width: 1024px) 50vw, 100vw" />
    </div>
  );
}

// The striped slot for a missing photo (Prettify fills it).
export function Placeholder() {
  return <div className="pf-img pf-ph" aria-hidden="true" />;
}
