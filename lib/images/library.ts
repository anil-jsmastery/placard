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

/** Every library photo with its tag, for the image picker (all tags when `tag` is omitted). */
export function listImages(tag?: ImageTag): (LibraryImage & { tag: ImageTag })[] {
  return ENTRIES.filter((e) => !tag || e.tag === tag).map((e) => ({ ...toImage(e), tag: e.tag as ImageTag }));
}

/** The tag of a library photo, from its path. */
export function getImageTag(src: string): ImageTag | undefined {
  return ENTRIES.find((e) => e.src === src)?.tag as ImageTag | undefined;
}
