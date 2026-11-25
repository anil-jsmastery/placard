import library from "./library.json";

export const IMAGE_TAGS = ["food", "office", "nature", "people", "product", "abstract"] as const;
export type ImageTag = (typeof IMAGE_TAGS)[number];

export type LibraryImage = { id: string; tag: ImageTag; alt: string; src: string; width: number; height: number };

export const LIBRARY = library as LibraryImage[];

export function getImageById(id: string): LibraryImage | undefined {
  return LIBRARY.find((img) => img.id === id);
}

export function libraryImage(id: string): { src: string; alt: string } {
  const img = getImageById(id);
  if (!img) throw new Error(`No library image "${id}"`);
  return { src: img.src, alt: img.alt };
}
