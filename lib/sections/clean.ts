import { PageSchema } from "./schemas";
import type { PageData } from "../site/types";

// Fields that may be an empty string (an image's alt text can be empty).
const KEEP_EMPTY = new Set(["alt"]);

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isEmpty = (v: unknown) => v === undefined || (typeof v === "string" && v.trim() === "");

/** Empty strings → undefined; a nested object (button, image) whose fields are all empty → undefined. */
function cleanObject(obj: Record<string, unknown>, collapse: boolean): Record<string, unknown> | undefined {
  if (collapse && Object.values(obj).every(isEmpty)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(obj)) {
    if (key === "__proto__") continue; // never let input set the prototype
    const c = cleanValue(key, v);
    if (c !== undefined) out[key] = c;
  }
  return out;
}

function cleanValue(key: string, v: unknown): unknown {
  if (typeof v === "string") return v.trim() === "" && !KEEP_EMPTY.has(key) ? undefined : v;
  // List items stay in place, so the schema reports an empty item instead of it disappearing.
  if (Array.isArray(v)) return v.map((item) => (isPlainObject(item) ? cleanObject(item, false) : item));
  if (isPlainObject(v)) return cleanObject(v, true);
  return v;
}

/**
 * Every save, publish and AI change goes through this: empty optional strings become
 * undefined, empty buttons and images are dropped, then the page is validated.
 */
export function cleanPage(data: unknown) {
  let input = data;
  if (isPlainObject(data)) {
    const root = data.root;
    input = {
      ...data,
      root: isPlainObject(root) && isPlainObject(root.props) ? { ...root, props: cleanObject(root.props, false) } : root,
      content: Array.isArray(data.content)
        ? data.content.map((s) => (isPlainObject(s) && isPlainObject(s.props) ? { ...s, props: cleanObject(s.props, false) } : s))
        : data.content,
    };
  }
  return PageSchema.safeParse(input) as ReturnType<typeof PageSchema.safeParse> & { data?: PageData };
}
