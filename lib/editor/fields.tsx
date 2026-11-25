"use client";

import { useId, useState } from "react";
import Image from "next/image";
import type { CustomField } from "@puckeditor/core";
import { Dialog as DialogPrimitive } from "radix-ui";
import { ChevronDown, Image as ImageIcon, Plus, X } from "lucide-react";
import { z } from "zod";
import { Dialog, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { SECTION_FIELDS, type SectionField } from "@/lib/sections/catalog";
import { Link, SECTION_SCHEMAS, type SectionType } from "@/lib/sections/schemas";
import { LIBRARY } from "@/lib/images/library";

// Every field in the editor is a Puck custom field drawing the prototype's markup (.field > .box …).

type Img = { src: string; alt: string };
type Btn = { label: string; href: string };
type Item = Record<string, unknown>;
type Schema = z.ZodType;

function unwrap(schema: Schema | undefined): Schema | undefined {
  let s = schema;
  while (s instanceof z.ZodOptional || s instanceof z.ZodDefault || s instanceof z.ZodNullable) s = s.unwrap() as Schema;
  return s;
}

function shapeOf(schema: Schema | undefined): Record<string, Schema> {
  const s = unwrap(schema);
  return s instanceof z.ZodObject ? (s.shape as Record<string, Schema>) : {};
}

const maxLengthOf = (schema: Schema | undefined) => {
  const s = unwrap(schema);
  return s instanceof z.ZodString ? (s.maxLength ?? undefined) : undefined;
};

function arrayBounds(schema: Schema | undefined) {
  const s = unwrap(schema);
  let min = 0;
  let max = Infinity;
  if (s instanceof z.ZodArray) {
    for (const c of s._zod.def.checks ?? []) {
      const d = c._zod.def as { check: string; minimum?: number; maximum?: number };
      if (d.check === "min_length" && d.minimum !== undefined) min = d.minimum;
      if (d.check === "max_length" && d.maximum !== undefined) max = d.maximum;
    }
  }
  return { min, max, element: s instanceof z.ZodArray ? (s.element as Schema) : undefined };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");
const summary = (it: Item) =>
  str(it.title) || str(it.role) || str(it.quote) || str(it.label) || str(it.caption) || str(it.platform) || "Item";
const singular = (label: string) => label.toLowerCase().replace(/s$/, "");

/* ---------------- top-level fields ---------------- */

function TextInput({ spec, value, onChange, maxLength }: { spec: SectionField; value: unknown; onChange: (v: string) => void; maxLength?: number }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{spec.label}</label>
      <div className="box">
        {spec.kind === "textarea" ? (
          <textarea
            className={spec.name === "text" || spec.name === "headline" ? "f-in tall" : "f-in"}
            id={id}
            value={str(value)}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <input className="f-in" type="text" id={id} value={str(value)} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
        )}
      </div>
    </div>
  );
}

function RadioInput({ spec, value, onChange }: { spec: SectionField; value: unknown; onChange: (v: string) => void }) {
  const options = spec.options ?? [];
  const current = str(value) || options[0];
  return (
    <div className="field">
      <span className="lbl">{spec.label}</span>
      <div className="box" style={{ padding: 6 }}>
        <div className="opt-seg" role="group" aria-label={spec.label}>
          {options.map((o) => (
            <button key={o} type="button" aria-pressed={current === o} onClick={() => onChange(o)}>{o}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LinkInput({ spec, value, onChange }: { spec: SectionField; value: Btn | undefined; onChange: (v: Btn | undefined) => void }) {
  const label = value?.label ?? "";
  const href = value?.href ?? "";
  const set = (next: Btn) => onChange(next.label === "" && next.href === "" ? undefined : next);
  const check = label || href ? Link.safeParse(href) : null;
  const error = check && !check.success ? check.error.issues[0]?.message : "";
  return (
    <div className="field">
      <span className="lbl">{spec.label}</span>
      <div className="box link-f">
        <input placeholder="Label" aria-label={`${spec.label} label`} value={label} maxLength={30} onChange={(e) => set({ label: e.target.value, href })} />
        <input placeholder="https:// or mailto:" aria-label={`${spec.label} link`} value={href} maxLength={500} onChange={(e) => set({ label, href: e.target.value })} />
        <p className="ck-err" role="alert">{error}</p>
      </div>
    </div>
  );
}

/* ---------------- image ---------------- */

// Until the picker arrives (Step 10), "Choose" opens the library grid only.
function LibraryDialog({ open, current, onClose, onPick }: { open: boolean; current?: string; onClose: () => void; onPick: (img: Img) => void }) {
  const [picked, setPicked] = useState<string | undefined>(current);
  const use = () => {
    const img = LIBRARY.find((i) => i.src === picked);
    if (img) onPick({ src: img.src, alt: img.alt });
    onClose();
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <div className="modal-bg show">
          <DialogPrimitive.Content className="shell modal pick" aria-describedby={undefined}>
            <div className="shell-head">
              <DialogTitle asChild><b>Choose a photo</b></DialogTitle>
              <DialogPrimitive.Close className="icon-btn sm" aria-label="Close"><X /></DialogPrimitive.Close>
            </div>
            <div className="shell-body">
              <div className="pick-grid">
                {LIBRARY.map((i) => (
                  <button key={i.id} type="button" aria-pressed={picked === i.src} title={i.alt} onClick={() => setPicked(i.src)}>
                    <Image src={i.src} alt={i.alt} fill sizes="170px" />
                  </button>
                ))}
              </div>
              <div className="pick-foot">
                <span className="stor" />
                <button type="button" className="btn btn-sm btn-soft" onClick={onClose}>Cancel</button>
                <button type="button" className="btn btn-sm btn-blue" disabled={!picked} onClick={use}>Use photo</button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </div>
      </DialogPortal>
    </Dialog>
  );
}

function ImagePicker({ value, onChange }: { value: Img | undefined; onChange: (v: Img) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="img-f">
      <span className="ph">
        {value ? <Image src={value.src} alt="" width={58} height={44} /> : <ImageIcon />}
      </span>
      <span className="tx">{value ? value.alt : "No photo yet"}</span>
      <button type="button" className="btn btn-soft" onClick={() => setOpen(true)}>{value ? "Change" : "Choose"}</button>
      {open && <LibraryDialog open current={value?.src} onClose={() => setOpen(false)} onPick={onChange} />}
    </div>
  );
}

function ImageInput({ spec, value, onChange }: { spec: SectionField; value: Img | undefined; onChange: (v: Img) => void }) {
  return (
    <div className="field">
      <span className="lbl">{spec.label}</span>
      <div className="box"><ImagePicker value={value} onChange={onChange} /></div>
    </div>
  );
}

/* ---------------- list items ---------------- */

// Comma separated text, stored as string[]. Keeps what's typed (a trailing comma) until it changes from outside.
function TagsInput({ id, value, onChange }: { id: string; value: unknown; onChange: (v: string[]) => void }) {
  const tags = Array.isArray(value) ? (value as string[]) : [];
  const [text, setText] = useState(tags.join(", "));
  const parse = (t: string) => t.split(",").map((x) => x.trim()).filter(Boolean);
  const shown = parse(text).join("\u0000") === tags.join("\u0000") ? text : tags.join(", ");
  return (
    <input
      id={id}
      value={shown}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parse(e.target.value));
      }}
    />
  );
}

function SubField({ spec, value, onChange, schema }: { spec: SectionField; value: unknown; onChange: (v: unknown) => void; schema?: Schema }) {
  const id = useId();
  const maxLength = maxLengthOf(schema);
  if (spec.kind === "image") {
    return (
      <div>
        <label>{spec.label}</label>
        <ImagePicker value={value as Img | undefined} onChange={onChange} />
      </div>
    );
  }
  if (spec.kind === "select") {
    return (
      <div>
        <label htmlFor={id}>{spec.label}</label>
        <select id={id} value={str(value) || spec.options?.[0]} onChange={(e) => onChange(e.target.value)}>
          {spec.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  }
  if (spec.kind === "tags") {
    return (
      <div>
        <label htmlFor={id}>{spec.label}</label>
        <TagsInput id={id} value={value} onChange={onChange} />
      </div>
    );
  }
  return (
    <div>
      <label htmlFor={id}>{spec.label}</label>
      {spec.kind === "textarea" ? (
        <textarea id={id} value={str(value)} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input id={id} value={str(value)} maxLength={maxLength} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function blankItem(fields: SectionField[]): Item {
  const item: Item = {};
  for (const f of fields) {
    if (f.kind === "tags") item[f.name] = [];
    else if (f.kind === "select") item[f.name] = f.options?.[0];
    else if (f.kind !== "image") item[f.name] = "";
  }
  return item;
}

function ListInput({ spec, value, onChange, schema }: { spec: SectionField; value: unknown; onChange: (v: Item[]) => void; schema?: Schema }) {
  const items = Array.isArray(value) ? (value as Item[]) : [];
  const fields = spec.fields ?? [];
  const { min, max, element } = arrayBounds(schema);
  const itemShape = shapeOf(element);
  const [open, setOpen] = useState(0);

  const setItem = (i: number, key: string, v: unknown) => {
    const next = items.map((it, j) => {
      if (j !== i) return it;
      const copy = { ...it };
      if (v === undefined) delete copy[key];
      else copy[key] = v;
      return copy;
    });
    onChange(next);
  };
  const add = () => {
    onChange([...items, blankItem(fields)]);
    setOpen(items.length);
  };
  const remove = (i: number) => {
    onChange(items.filter((_, j) => j !== i));
    setOpen(-1);
  };

  return (
    <div className="field">
      <span className="lbl">{spec.label}</span>
      <div className="box">
        <div className="arr">
          {items.map((it, i) => (
            <details key={i} open={i === open}>
              <summary>
                <span className="n">{String(i + 1).padStart(2, "0")}</span>
                <span className="t">{summary(it)}</span>
                <ChevronDown />
              </summary>
              <div className="a-body">
                {fields.map((f) => (
                  <SubField key={f.name} spec={f} value={it[f.name]} schema={itemShape[f.name]} onChange={(v) => setItem(i, f.name, v)} />
                ))}
                {items.length > min && (
                  <div><button type="button" className="btn btn-sm btn-soft" onClick={() => remove(i)}>Remove</button></div>
                )}
              </div>
            </details>
          ))}
          <button type="button" className="arr-add" disabled={items.length >= max} onClick={add}>
            <Plus />Add {singular(spec.label)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Puck fields per section ---------------- */

function FieldFor({ spec, value, onChange, schema }: { spec: SectionField; value: unknown; onChange: (v: unknown) => void; schema?: Schema }) {
  switch (spec.kind) {
    case "text":
    case "textarea":
      return <TextInput spec={spec} value={value} onChange={onChange} maxLength={maxLengthOf(schema)} />;
    case "radio":
      return <RadioInput spec={spec} value={value} onChange={onChange} />;
    case "link":
      return <LinkInput spec={spec} value={value as Btn | undefined} onChange={onChange} />;
    case "image":
      return <ImageInput spec={spec} value={value as Img | undefined} onChange={onChange} />;
    case "list":
      return <ListInput spec={spec} value={value} onChange={onChange} schema={schema} />;
    default:
      // tags and select only appear inside list items; draw them the same way if a section ever has one on top.
      return (
        <div className="field">
          <span className="lbl">{spec.label}</span>
          <div className="box"><SubField spec={spec} value={value} onChange={onChange} schema={schema} /></div>
        </div>
      );
  }
}

export type SectionFields = Record<string, CustomField<unknown>>;

// The Puck fields of one section type, built from SECTION_FIELDS (Step 2).
export function sectionFields(type: SectionType): SectionFields {
  const shape = shapeOf(SECTION_SCHEMAS[type]);
  return Object.fromEntries(
    SECTION_FIELDS[type].map((spec) => [
      spec.name,
      {
        type: "custom",
        label: spec.label,
        render: ({ value, onChange }) => <FieldFor spec={spec} value={value} onChange={onChange} schema={shape[spec.name]} />,
      } satisfies CustomField<unknown>,
    ]),
  );
}
