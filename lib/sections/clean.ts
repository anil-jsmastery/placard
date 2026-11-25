import { z } from "zod";
import { PageSchema, RootProps, SECTION_SCHEMAS, type SectionType } from "./schemas";

type Schema = z.ZodType;

const isPlain = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

// An empty string, or a button or link whose fields are all empty.
const isEmpty = (v: unknown): boolean =>
  v === undefined || v === null || (typeof v === "string" && v.trim() === "") ||
  (isPlain(v) && Object.values(v).every(isEmpty));

function unwrap(schema: Schema): Schema {
  let s = schema;
  while (s instanceof z.ZodOptional || s instanceof z.ZodDefault || s instanceof z.ZodNullable) s = s.unwrap() as Schema;
  return s;
}

function cleanValue(schema: Schema, value: unknown): unknown {
  const inner = unwrap(schema);
  if (inner instanceof z.ZodArray && Array.isArray(value)) {
    return value.map((item) => cleanValue(inner.element as Schema, item));
  }
  if (inner instanceof z.ZodObject && isPlain(value)) {
    const shape = inner.shape as Record<string, Schema>;
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value)) {
      const field = shape[key];
      if (!field) { out[key] = v; continue; }
      const cleaned = cleanValue(field, v);
      // Only optional fields lose their empty values; a required one stays and fails the schema.
      if (isEmpty(cleaned) && field.safeParse(undefined).success) continue;
      out[key] = cleaned;
    }
    return out;
  }
  return value;
}

// Every save, publish and AI change goes through this.
export function cleanPage(data: unknown) {
  if (!isPlain(data)) return PageSchema.safeParse(data);
  const root = isPlain(data.root) ? { ...data.root, props: cleanValue(RootProps, data.root.props) } : data.root;
  const content = Array.isArray(data.content)
    ? data.content.map((s) => {
        if (!isPlain(s) || typeof s.type !== "string" || !(s.type in SECTION_SCHEMAS)) return s;
        return { ...s, props: cleanValue(SECTION_SCHEMAS[s.type as SectionType], s.props) };
      })
    : data.content;
  return PageSchema.safeParse({ ...data, root, content });
}
