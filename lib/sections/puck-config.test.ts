import { describe, expect, it } from "vitest";
import { puckConfig } from "./puck-config";
import { SECTION_SCHEMAS, SECTION_TYPES } from "./schemas";

describe("puck config", () => {
  it("has one component per section type", () => {
    expect(Object.keys(puckConfig.components).sort()).toEqual([...SECTION_TYPES].sort());
  });

  it.each(SECTION_TYPES)("%s: the field keys equal the schema keys", (type) => {
    const fields = puckConfig.components[type].fields ?? {};
    expect(Object.keys(fields).sort()).toEqual(Object.keys(SECTION_SCHEMAS[type].shape).sort());
  });

  it("builds list fields with the schema's min and max", () => {
    const items = puckConfig.components.Features.fields?.items;
    expect(items).toMatchObject({ type: "array", min: 2, max: 8 });
    const plans = puckConfig.components.Pricing.fields?.plans;
    expect(plans).toMatchObject({ type: "array", min: 1, max: 4 });
  });

  it("follows the field rules", () => {
    const hero = puckConfig.components.Hero.fields!;
    expect(hero.headline).toMatchObject({ type: "text", label: "Headline" });
    expect(hero.subheadline).toMatchObject({ type: "textarea", label: "Subheadline" });
    expect(hero.layout).toMatchObject({ type: "radio" });
    expect(hero.primaryButton).toMatchObject({ type: "object", label: "Primary button" });
    expect(hero.image).toMatchObject({ type: "custom" });
    const icon = (puckConfig.components.Features.fields!.items as { arrayFields: Record<string, { type: string; options: unknown[] }> }).arrayFields.icon;
    expect(icon.type).toBe("select");
    expect(icon.options).toHaveLength(24);
  });
});
