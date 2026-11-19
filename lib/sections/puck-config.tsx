import { useId, useState } from "react";
import type { ComponentConfig, Config, CustomField, Field, Fields } from "@puckeditor/core";
import type { z } from "zod";
import { Switch } from "@/components/ui/switch";
import { ImageField, type ImageValue } from "@/components/editor/image-field";
import { LinkField, type FieldMeta } from "@/components/editor/fields";
import { TabIconField } from "@/components/editor/tab-icon-field";
import { SiteRoot } from "@/components/site/site-root";
import { Hero } from "@/components/site/sections/hero";
import { About } from "@/components/site/sections/about";
import { Features } from "@/components/site/sections/features";
import { Services } from "@/components/site/sections/services";
import { Gallery } from "@/components/site/sections/gallery";
import { Testimonials } from "@/components/site/sections/testimonials";
import { Pricing } from "@/components/site/sections/pricing";
import { FAQ } from "@/components/site/sections/faq";
import { CallToAction } from "@/components/site/sections/call-to-action";
import { Contact } from "@/components/site/sections/contact";
import { Links } from "@/components/site/sections/links";
import { FONT_META, THEME_META, type Font, type Theme } from "@/lib/site/themes";
import type { PageData, SectionProps } from "@/lib/site/types";
import { cn } from "@/lib/utils";
import { SECTION_CATALOG } from "./catalog";
import { Button as ButtonSchema, FONTS, Image as ImageSchema, Link as LinkSchema, RootProps as RootPropsSchema, SECTION_SCHEMAS, SECTION_TYPES, THEMES, type SectionType } from "./schemas";

const COMPONENTS: { [T in SectionType]: React.ComponentType<SectionProps<T>> } = {
  Hero, About, Features, Services, Gallery, Testimonials, Pricing, FAQ, CallToAction, Contact, Links,
};

// ---------------------------------------------------------------------------
// Labels

const LABEL_OVERRIDES: Record<string, string> = {
  href: "Link",
  features: "Features (one per line)",
  highlighted: "Highlight this plan",
};

const sentenceCase = (s: string) => {
  const words = s.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** A field's label: the prop name in sentence case ("primaryButton" → "Primary button"; `href` is "Link"). */
export const fieldLabel = (key: string) => LABEL_OVERRIDES[key] ?? sentenceCase(key);

export const ROOT_FIELD_LABELS = {
  title: "Site title",
  theme: "Theme",
  font: "Heading font",
  favicon: "Tab icon",
  description: "Search description",
  showBadge: "Show badge",
} as const;

// ---------------------------------------------------------------------------
// Schema introspection (zod 4)

type AnySchema = z.ZodType & { def: { type: string; innerType?: AnySchema; checks?: { _zod: { def: Record<string, unknown> } }[] } };

function unwrap(schema: z.ZodType): { inner: AnySchema; optional: boolean } {
  let s = schema as AnySchema;
  let optional = false;
  while (s.def.type === "optional" || s.def.type === "default") {
    if (s.def.type === "optional") optional = true;
    s = s.def.innerType as AnySchema;
  }
  return { inner: s, optional };
}

function lengthBounds(s: AnySchema) {
  let min: number | undefined;
  let max: number | undefined;
  for (const check of s.def.checks ?? []) {
    const d = check._zod.def;
    if (d.check === "min_length") min = d.minimum as number;
    if (d.check === "max_length") max = d.maximum as number;
  }
  return { min, max };
}

const shapeOf = (s: AnySchema) => (s as unknown as z.ZodObject).shape as Record<string, z.ZodType>;
const isSingleLine = (s: AnySchema) =>
  s === (LinkSchema as unknown) || (s as unknown as { format?: string }).format === "email";

// ---------------------------------------------------------------------------
// Custom fields

function ImageCustomField(label: string, optional: boolean): CustomField<ImageValue | undefined> {
  return {
    type: "custom",
    label,
    render: ({ field, value, onChange, readOnly }) => (
      <ImageField
        label={label}
        nested={(field as FieldMeta).nested}
        value={value}
        onChange={(v) => onChange(v)}
        optional={optional}
        readOnly={readOnly}
      />
    ),
  };
}

function LinkCustomField(label: string): CustomField<string | undefined> {
  return {
    type: "custom",
    label,
    render: ({ field, id, value, onChange, readOnly }) => (
      <LinkField label={label} nested={(field as FieldMeta).nested} id={id} value={value} onChange={onChange} readOnly={readOnly} />
    ),
  };
}

function FeaturesTextarea({ value, onChange, readOnly }: { value: string[] | undefined; onChange: (v: string[]) => void; readOnly?: boolean }) {
  const id = useId();
  const joined = (value ?? []).join("\n");
  const [text, setText] = useState(joined);
  const [synced, setSynced] = useState(joined);
  // Undo, redo or an AI change replaced the list: show it.
  if (joined !== synced) {
    setSynced(joined);
    setText(joined);
  }
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        Features <span className="font-normal">(one per line)</span>
      </label>
      <textarea
        id={id}
        rows={3}
        value={text}
        readOnly={readOnly}
        onChange={(e) => {
          const next = e.target.value;
          const list = next.split("\n").map((l) => l.trim()).filter(Boolean);
          setText(next);
          setSynced(list.join("\n"));
          onChange(list);
        }}
        className="mt-1.5 w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm"
      />
    </div>
  );
}

function HighlightSwitch({ value, onChange, readOnly }: { value: boolean | undefined; onChange: (v: boolean) => void; readOnly?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm" htmlFor={id}>
        Highlight this plan
      </label>
      <Switch id={id} checked={!!value} disabled={readOnly} onCheckedChange={onChange} />
    </div>
  );
}

function ThemePicker({ value, onChange }: { value: Theme; onChange: (v: Theme) => void }) {
  const name = useId();
  return (
    <fieldset>
      <legend className="text-sm font-medium">{ROOT_FIELD_LABELS.theme}</legend>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {THEMES.map((t) => {
          const meta = THEME_META[t];
          const checked = value === t;
          return (
            <label key={t} className="cursor-pointer">
              <input type="radio" name={name} value={t} checked={checked} onChange={() => onChange(t)} className="peer sr-only" />
              <span className={cn("block rounded-lg border-2 p-0.5 peer-focus-visible:outline-2", checked ? "border-primary" : "border-transparent")}>
                <span className="flex h-12 flex-col justify-end gap-1 rounded-md border border-black/10 p-2" style={{ background: meta.bg }}>
                  <span className="h-1.5 w-8 rounded-full" style={{ background: meta.text }} />
                  <span className="h-1.5 w-5 rounded-full" style={{ background: meta.accent }} />
                </span>
              </span>
              <span className={cn("mt-1 block text-center text-xs", checked ? "font-semibold" : "text-muted-foreground")}>{meta.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function FontPicker({ value, onChange }: { value: Font; onChange: (v: Font) => void }) {
  const labelId = useId();
  return (
    <div>
      <span id={labelId} className="text-sm font-medium">
        {ROOT_FIELD_LABELS.font}
      </span>
      <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-labelledby={labelId}>
        {FONTS.map((f) => {
          const checked = value === f;
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => onChange(f)}
              className={cn(
                "flex h-12 flex-col items-center justify-center rounded-md",
                checked ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span className="text-lg font-bold" style={{ fontFamily: `var(--font-site-${f})` }}>
                Aa
              </span>
              <span className="text-xs">{FONT_META[f].label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DescriptionField({ value, onChange, readOnly }: { value: string | undefined; onChange: (v: string) => void; readOnly?: boolean }) {
  const id = useId();
  const text = value ?? "";
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {ROOT_FIELD_LABELS.description}
      </label>
      <textarea
        id={id}
        rows={3}
        maxLength={160}
        value={text}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm"
      />
      <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">{text.length} / 160</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Fields from the schemas (Step 3, 3.2)

const RADIO_KEYS = new Set(["layout", "columns"]);

/** Each list's label and its item name ("Add plan", "Add question"). */
const LIST_NAMES: Partial<Record<SectionType, Record<string, { label: string; singular: string }>>> = {
  Features: { items: { label: "Features", singular: "feature" } },
  Services: { items: { label: "Services", singular: "service" } },
  Gallery: { images: { label: "Images", singular: "image" } },
  Testimonials: { items: { label: "Testimonials", singular: "testimonial" } },
  Pricing: { plans: { label: "Plans", singular: "plan" } },
  FAQ: { items: { label: "Questions", singular: "question" } },
  Contact: { socials: { label: "Social links", singular: "social link" } },
  Links: { items: { label: "Links", singular: "link" } },
};

function enumOptions(key: string, values: readonly string[]) {
  // Feature icons are listed by name; other choices in sentence case.
  return values.map((v) => ({ value: v, label: key === "icon" ? v : sentenceCase(v) }));
}

/** A valid starting item for a list that has no example in the catalog. */
function defaultFor(schema: z.ZodType): unknown {
  const { inner, optional } = unwrap(schema);
  if (optional) return undefined;
  if (inner.def.type === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(shapeOf(inner))) {
      const d = defaultFor(v);
      if (d !== undefined) out[k] = d;
    }
    return out;
  }
  if (inner.def.type === "enum") return (inner as unknown as z.ZodEnum).options[0];
  if (inner.def.type === "boolean") return false;
  if (inner.def.type === "array") return [];
  if (inner === (LinkSchema as unknown)) return "https://";
  return "";
}

function fieldFor(key: string, schema: z.ZodType, example: unknown, list?: { label: string; singular: string }): Field {
  const { inner, optional } = unwrap(schema);
  const label = list?.label ?? fieldLabel(key);

  if (inner === (ImageSchema as unknown)) return ImageCustomField(label, optional) as Field;

  if (key === "features" && inner.def.type === "array") {
    return {
      type: "custom",
      label,
      render: ({ value, onChange, readOnly }) => <FeaturesTextarea value={value} onChange={onChange} readOnly={readOnly} />,
    } satisfies CustomField<string[] | undefined> as Field;
  }

  if (key === "highlighted") {
    return {
      type: "custom",
      label,
      render: ({ value, onChange, readOnly }) => <HighlightSwitch value={value} onChange={onChange} readOnly={readOnly} />,
    } satisfies CustomField<boolean | undefined> as Field;
  }

  if (inner === (LinkSchema as unknown)) return LinkCustomField(label) as Field;

  if (inner === (ButtonSchema as unknown)) {
    const buttonShape = shapeOf(inner);
    return {
      type: "object",
      label,
      optional,
      objectFields: {
        label: { type: "text", label: "Label", maxLength: (unwrap(buttonShape.label).inner as unknown as z.ZodString).maxLength ?? undefined },
        href: LinkCustomField(fieldLabel("href")),
      },
    } as Field & FieldMeta;
  }

  if (inner.def.type === "enum") {
    const options = enumOptions(key, (inner as unknown as z.ZodEnum).options as string[]);
    return RADIO_KEYS.has(key) ? { type: "radio", label, options } : { type: "select", label, options };
  }

  if (inner.def.type === "array") {
    const element = (inner as unknown as z.ZodArray<z.ZodType>).element;
    const shape = shapeOf(element as AnySchema);
    const { min, max } = lengthBounds(inner);
    const exampleItem = Array.isArray(example) && example.length > 0 ? example[0] : defaultFor(element);
    const arrayFields: Fields = {};
    for (const [k, v] of Object.entries(shape)) {
      arrayFields[k] = fieldFor(k, v, (exampleItem as Record<string, unknown> | undefined)?.[k]);
    }
    const singular = list?.singular ?? "item";
    return {
      type: "array",
      label,
      singular,
      arrayFields,
      min,
      max,
      defaultItemProps: structuredClone(exampleItem) as Record<string, unknown>,
      getItemSummary: (item: Record<string, unknown>, index?: number) => {
        for (const k of ["title", "name", "label", "question", "caption"]) {
          const v = item?.[k];
          if (typeof v === "string" && v.trim()) return v;
        }
        if (typeof item?.platform === "string") return sentenceCase(item.platform);
        return `${sentenceCase(singular)} ${(index ?? 0) + 1}`;
      },
    } as Field & FieldMeta;
  }

  if (inner.def.type === "string") {
    const maxLength = (inner as unknown as z.ZodString).maxLength ?? undefined;
    const type = isSingleLine(inner) || (maxLength ?? Infinity) <= 80 ? "text" : "textarea";
    return { type, label, maxLength } as Field & FieldMeta;
  }

  throw new Error(`No editor field for "${key}" (${inner.def.type})`);
}

function sectionFields(type: SectionType): Fields {
  const shape = SECTION_SCHEMAS[type].shape as Record<string, z.ZodType>;
  const defaults = SECTION_CATALOG[type].defaultProps as Record<string, unknown>;
  const fields: Fields = {};
  for (const [key, schema] of Object.entries(shape)) fields[key] = fieldFor(key, schema, defaults[key], LIST_NAMES[type]?.[key]);
  return fields;
}

// ---------------------------------------------------------------------------
// Config

type RootProps = PageData["root"]["props"];

function sectionConfig<T extends SectionType>(type: T): ComponentConfig {
  const Component = COMPONENTS[type] as React.ComponentType<Record<string, unknown>>;
  return {
    label: SECTION_CATALOG[type].label,
    defaultProps: SECTION_CATALOG[type].defaultProps as Record<string, unknown>,
    fields: sectionFields(type),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    render: ({ id, puck, editMode, ...props }) => <Component {...props} />,
  };
}

export const puckConfig: Config = {
  components: Object.fromEntries(SECTION_TYPES.map((t) => [t, sectionConfig(t)])),
  root: {
    fields: {
      title: { type: "text", label: ROOT_FIELD_LABELS.title, maxLength: RootPropsSchema.shape.title.maxLength ?? undefined } as Field & FieldMeta,
      theme: {
        type: "custom",
        label: ROOT_FIELD_LABELS.theme,
        render: ({ value, onChange }) => <ThemePicker value={value} onChange={onChange} />,
      },
      font: {
        type: "custom",
        label: ROOT_FIELD_LABELS.font,
        render: ({ value, onChange }) => <FontPicker value={value} onChange={onChange} />,
      },
      favicon: {
        type: "custom",
        label: ROOT_FIELD_LABELS.favicon,
        render: ({ value, onChange, readOnly }) => <TabIconField label={ROOT_FIELD_LABELS.favicon} value={value} onChange={onChange} readOnly={readOnly} />,
      },
      description: {
        type: "custom",
        label: ROOT_FIELD_LABELS.description,
        render: ({ value, onChange, readOnly }) => <DescriptionField value={value} onChange={onChange} readOnly={readOnly} />,
      },
    },
    render: ({ children, ...props }: { children: React.ReactNode }) => {
      const { title, theme, font, showBadge } = props as Partial<RootProps>;
      return (
        <SiteRoot
          title={title ?? ""}
          theme={theme ?? "paper"}
          font={font ?? "sans"}
          favicon=""
          description=""
          showBadge={showBadge ?? true}
          className="min-h-screen"
        >
          {children}
        </SiteRoot>
      );
    },
  },
};

/** Section types in Add-panel order, with their catalog entry. */
export const SECTION_LIST = SECTION_TYPES.map((type) => ({ type, ...SECTION_CATALOG[type] }));
