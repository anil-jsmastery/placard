"use client";

import { useId, useState } from "react";
import type { ArrayField, CustomField, Field, FieldProps, ObjectField, Overrides, SelectField } from "@puckeditor/core";
import { ChevronDown, ChevronRight, GripVertical, Plus, Trash2 } from "lucide-react";
import { Link as LinkSchema } from "@/lib/sections/schemas";
import { cn } from "@/lib/utils";
import { moveItem, useSortable } from "./sortable";

/**
 * What puck-config adds to a field so these controls can render it:
 * the schema's `maxLength`, whether it sits inside a list item (`nested`: smaller labels),
 * whether it may be left out (`optional`), and a list's item name (`singular`).
 */
export type FieldMeta = { maxLength?: number; nested?: boolean; optional?: boolean; singular?: string };

type AnyField = Field & FieldMeta;

const inputClass =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm";
const textareaClass =
  "w-full resize-none rounded-md border border-input bg-card px-3 py-2 text-base leading-relaxed outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm";

const labelClass = (nested?: boolean) => (nested ? "text-xs font-medium text-muted-foreground" : "text-sm font-medium");
const gapClass = (nested?: boolean) => (nested ? "mt-1.5" : "mt-2");

// ---------------------------------------------------------------------------
// Text and textarea: maxLength from the schema, a counter past 80%

function Counter({ length, max }: { length: number; max?: number }) {
  if (!max || length <= max * 0.8) return null;
  return (
    <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">
      {length} / {max}
    </p>
  );
}

function TextControl({ field, value, onChange, id, readOnly, multiline }: ControlProps<string | undefined> & { multiline?: boolean }) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const text = value ?? "";
  const max = field.maxLength;
  return (
    <div>
      <label htmlFor={inputId} className={labelClass(field.nested)}>
        {field.label}
      </label>
      {multiline ? (
        <textarea
          id={inputId}
          rows={3}
          maxLength={max}
          value={text}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className={cn(gapClass(field.nested), textareaClass)}
        />
      ) : (
        <input
          id={inputId}
          maxLength={max}
          value={text}
          readOnly={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className={cn(gapClass(field.nested), inputClass)}
        />
      )}
      <Counter length={text.length} max={max} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Links: mono input, helper text, the Link schema's message when invalid

function linkError(value: string | undefined) {
  const result = LinkSchema.safeParse(value ?? "");
  return result.success ? null : result.error.issues[0]?.message ?? null;
}

function LinkHelp({ value, errorId }: { value: string | undefined; errorId: string }) {
  const error = linkError(value);
  return (
    <>
      <p className="mt-1.5 text-xs text-muted-foreground">Starts with https://, mailto: or tel:</p>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </>
  );
}

function LinkInput({ id, value, onChange, readOnly, errorId, className }: {
  id: string;
  value: string | undefined;
  onChange: (value: string) => void;
  readOnly?: boolean;
  errorId: string;
  className?: string;
}) {
  const invalid = !!linkError(value);
  return (
    <input
      id={id}
      type="text"
      inputMode="url"
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      maxLength={500}
      value={value ?? ""}
      readOnly={readOnly}
      aria-invalid={invalid || undefined}
      aria-describedby={invalid ? errorId : undefined}
      onChange={(e) => onChange(e.target.value)}
      className={cn(className, inputClass, "font-mono sm:text-xs")}
    />
  );
}

/** Custom field for every `href`/`url` (the `Link` schema). */
export function LinkField({ label, nested, value, onChange, id, readOnly }: {
  label: string;
  nested?: boolean;
  value: string | undefined;
  onChange: (value: string) => void;
  id?: string;
  readOnly?: boolean;
}) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const errorId = `${inputId}-error`;
  return (
    <div>
      <label htmlFor={inputId} className={labelClass(nested)}>
        {label}
      </label>
      <LinkInput id={inputId} value={value} onChange={onChange} readOnly={readOnly} errorId={errorId} className={gapClass(nested)} />
      <LinkHelp value={value} errorId={errorId} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Button (object field { label, href }): label and link side by side

type ButtonValue = { label: string; href: string };

function ButtonControl({ field, value, onChange, id, readOnly }: ControlProps<ButtonValue | undefined>) {
  const fallbackId = useId();
  const base = id ?? fallbackId;
  const errorId = `${base}-href-error`;
  const objectField = field as unknown as ObjectField & FieldMeta;
  const labelMax = (objectField.objectFields.label as AnyField | undefined)?.maxLength;
  const nested = field.nested;
  const label = value?.label ?? "";

  const set = (patch: Partial<ButtonValue>) => {
    const next = { label: value?.label ?? "", href: value?.href ?? "", ...patch };
    // An optional button with nothing in it is left out of the page.
    onChange(field.optional && !next.label.trim() && !next.href.trim() ? undefined : next);
  };

  return (
    <div>
      {!nested && <span className="text-sm font-medium">{field.label}</span>}
      <div className={cn("grid grid-cols-2 gap-2", !nested && "mt-2")}>
        <div>
          <label htmlFor={`${base}-label`} className="text-xs font-medium text-muted-foreground">
            {nested ? field.label : "Label"}
          </label>
          <input
            id={`${base}-label`}
            maxLength={labelMax}
            value={label}
            readOnly={readOnly}
            onChange={(e) => set({ label: e.target.value })}
            className={cn("mt-1.5", inputClass)}
          />
          <Counter length={label.length} max={labelMax} />
        </div>
        <div>
          <label htmlFor={`${base}-href`} className="text-xs font-medium text-muted-foreground">
            Link
          </label>
          <LinkInput
            id={`${base}-href`}
            value={value?.href}
            onChange={(href) => set({ href })}
            readOnly={readOnly}
            errorId={errorId}
            className="mt-1.5"
          />
        </div>
      </div>
      {(!field.optional || value) && <LinkHelp value={value?.href} errorId={errorId} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Select: a native select styled like the inputs

function SelectControl({ field, value, onChange, id, readOnly }: ControlProps<string>) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const options = (field as unknown as SelectField).options;
  return (
    <div>
      <label htmlFor={inputId} className={labelClass(field.nested)}>
        {field.label}
      </label>
      <div className={cn("relative", gapClass(field.nested))}>
        <select
          id={inputId}
          value={value ?? ""}
          disabled={readOnly}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClass, "appearance-none pr-9")}
        >
          {options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 shrink-0 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// One field inside a list item

type ControlProps<V> = {
  field: AnyField;
  value: V;
  onChange: (value: V) => void;
  id?: string;
  readOnly?: boolean;
};

function FieldControl({ field, name, ...props }: ControlProps<unknown> & { name: string }) {
  const id = props.id ?? name;
  switch (field.type) {
    case "custom":
      return (field as CustomField<unknown>).render({
        field: field as CustomField<unknown>,
        name,
        id,
        value: props.value,
        onChange: props.onChange,
        readOnly: props.readOnly,
      });
    case "text":
      return <TextControl {...(props as ControlProps<string | undefined>)} field={field} id={id} />;
    case "textarea":
      return <TextControl {...(props as ControlProps<string | undefined>)} field={field} id={id} multiline />;
    case "select":
      return <SelectControl {...(props as ControlProps<string>)} field={field} id={id} />;
    case "object":
      return <ButtonControl {...(props as ControlProps<ButtonValue | undefined>)} field={field} id={id} />;
    default:
      throw new Error(`No list control for "${field.type}"`);
  }
}

/** Sub-fields shown side by side inside an open item (editor.html: Price | Period). */
const PAIRS: [string, string][] = [["price", "period"]];

// ---------------------------------------------------------------------------
// Lists (editor.html, the Plans list)

type Item = Record<string, unknown>;

let rowKeySeq = 0;
const newRowKey = () => `row-${rowKeySeq++}`;

function ArrayControl({ field, value, onChange, id, readOnly, name }: ControlProps<Item[] | undefined> & { name: string }) {
  const arrayField = field as unknown as ArrayField & FieldMeta;
  const items = Array.isArray(value) ? value : [];
  const singular = arrayField.singular ?? "item";
  const { min = 0, max } = arrayField;
  const [open, setOpen] = useState<number | null>(null);

  // Stable keys for the rows while items are added, removed and moved;
  // a list changed from outside (undo, the AI) gets new ones.
  const [keys, setKeys] = useState(() => items.map(newRowKey));
  if (keys.length !== items.length) setKeys(items.map(newRowKey));

  const commit = (next: Item[]) => onChange(next);

  const move = (from: number, to: number) => {
    setKeys(moveItem(keys, from, to));
    if (open === from) setOpen(to);
    else if (open !== null && from < open && to >= open) setOpen(open - 1);
    else if (open !== null && from > open && to <= open) setOpen(open + 1);
    commit(moveItem(items, from, to));
  };
  const sortable = useSortable(items.length, move, value);

  const add = () => {
    const defaults = arrayField.defaultItemProps;
    const item = structuredClone((typeof defaults === "function" ? defaults(items.length) : defaults) ?? {}) as Item;
    setKeys([...keys, newRowKey()]);
    setOpen(items.length);
    commit([...items, item]);
  };

  const remove = (index: number) => {
    setKeys(keys.filter((_, i) => i !== index));
    setOpen(null);
    commit(items.filter((_, i) => i !== index));
  };

  const update = (index: number, key: string, v: unknown) => {
    const item = { ...items[index] };
    if (v === undefined) delete item[key];
    else item[key] = v;
    commit(items.map((it, i) => (i === index ? item : it)));
  };

  const atMax = max !== undefined && items.length >= max;
  const canRemove = items.length > min;
  const summary = (item: Item, index: number) => arrayField.getItemSummary?.(item, index) ?? `${singular} ${index + 1}`;
  const subFields = Object.entries(arrayField.arrayFields) as [string, AnyField][];

  const renderSub = (index: number, key: string, sub: AnyField) => (
    <FieldControl
      key={key}
      field={{ ...sub, nested: true } as AnyField}
      name={`${name}[${index}].${key}`}
      id={`${id ?? name}-${index}-${key}`}
      value={items[index]?.[key]}
      onChange={(v) => update(index, key, v)}
      readOnly={readOnly}
    />
  );

  const renderBody = (index: number) => {
    const paired = new Set(PAIRS.flat());
    return (
      <div className="space-y-4 border-t border-border p-3">
        {subFields.map(([key, sub]) => {
          const pair = PAIRS.find(([a]) => a === key);
          if (pair && arrayField.arrayFields[pair[1]]) {
            return (
              <div key={key} className="grid grid-cols-[1fr_110px] gap-2">
                {renderSub(index, key, sub)}
                {renderSub(index, pair[1], arrayField.arrayFields[pair[1]] as AnyField)}
              </div>
            );
          }
          if (paired.has(key) && PAIRS.some(([a, b]) => b === key && arrayField.arrayFields[a])) return null;
          return renderSub(index, key, sub);
        })}
        {canRemove && !readOnly && (
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 text-xs font-medium text-destructive hover:underline sm:h-auto"
            onClick={() => remove(index)}
          >
            <Trash2 className="size-3.5 shrink-0" aria-hidden="true" />
            Remove {singular}
          </button>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{field.label}</span>
        {max !== undefined && (
          <span className="text-xs text-muted-foreground">
            {items.length} of {max}
          </span>
        )}
      </div>
      <div className="mt-2 space-y-2">
        {items.map((item, index) => {
          const isOpen = open === index;
          const drop = sortable.dropAt(index);
          return (
            <div
              key={keys[index] ?? index}
              ref={sortable.rowRef(index)}
              className={cn(
                "relative rounded-md border",
                isOpen ? "border-input" : "border-border",
                sortable.dragging === index && "opacity-50",
              )}
            >
              {drop && (
                <span
                  className={cn("absolute inset-x-0 h-0.5 rounded-full bg-primary", drop === "before" ? "-top-1.25" : "-bottom-1.25")}
                  aria-hidden="true"
                />
              )}
              <div className={cn("flex h-10 items-center text-sm", !isOpen && "rounded-md hover:bg-accent")}>
                <button
                  type="button"
                  className="grid h-10 w-9 shrink-0 cursor-grab place-items-center rounded-l-md pl-0.5 text-muted-foreground active:cursor-grabbing disabled:cursor-default"
                  aria-label={`Move ${singular} ${index + 1}`}
                  disabled={readOnly || items.length < 2}
                  {...sortable.handleProps(index)}
                >
                  <GripVertical className="size-4 shrink-0" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={cn("flex h-10 min-w-0 flex-1 items-center gap-2 pr-2.5 text-left", isOpen && "font-medium")}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : index)}
                >
                  <span className="truncate">{summary(item, index)}</span>
                  {isOpen ? (
                    <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  )}
                </button>
              </div>
              {isOpen && renderBody(index)}
            </div>
          );
        })}
        <button
          type="button"
          disabled={atMax || readOnly}
          onClick={add}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-dashed border-input text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <Plus className="size-4 shrink-0" aria-hidden="true" />
          {atMax ? `Up to ${max}` : `Add ${singular}`}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Puck field overrides

type OverrideProps = FieldProps<Field, unknown> & { children: React.ReactNode; name: string };

// Puck passes each override the field's value untyped; the control decides its shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asControl = (props: OverrideProps): ControlProps<any> => ({ ...(props as unknown as ControlProps<unknown>), field: props.field as AnyField });

export const fieldTypeOverrides: Partial<Overrides["fieldTypes"]> = {
  text: (props: OverrideProps) => <TextControl {...asControl(props)} />,
  textarea: (props: OverrideProps) => <TextControl {...asControl(props)} multiline />,
  select: (props: OverrideProps) => <SelectControl {...asControl(props)} />,
  object: (props: OverrideProps) => {
    const field = props.field as ObjectField;
    // Only buttons are object fields; anything else keeps Puck's own rendering.
    if (!("label" in field.objectFields && "href" in field.objectFields)) return <>{props.children}</>;
    return <ButtonControl {...asControl(props)} />;
  },
  array: (props: OverrideProps) => <ArrayControl {...asControl(props)} name={props.name} />,
} as Partial<Overrides["fieldTypes"]>;
