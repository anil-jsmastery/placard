import library from "./library.json";

export const IMAGE_TAGS = ["food", "office", "nature", "people", "product", "abstract"] as const;
export type ImageTag = (typeof IMAGE_TAGS)[number];

export type LibraryImage = { id: string; src: string; alt: string };

type Entry = { id: string; tag: string; alt: string; src: string; width: number; height: number };
const ENTRIES = library as Entry[];

const toImage = ({ id, src, alt }: Entry): LibraryImage => ({ id, src, alt });

/** Library photos with this tag, in file order. */
export function findImages(tag: ImageTag, limit = 6): LibraryImage[] {
  return ENTRIES.filter((e) => e.tag === tag).slice(0, limit).map(toImage);
}

export function getImageById(id: string): LibraryImage | undefined {
  const entry = ENTRIES.find((e) => e.id === id);
  return entry ? toImage(entry) : undefined;
}
