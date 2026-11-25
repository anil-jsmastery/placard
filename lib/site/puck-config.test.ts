import { describe, expect, it } from "vitest";
import { SECTION_SCHEMAS, SECTION_TYPES } from "@/lib/sections/schemas";
import { puckConfig } from "./puck-config";

describe("puck config", () => {
  it.each(SECTION_TYPES)("%s fields match its schema", (type) => {
    const fields = Object.keys(puckConfig.components[type].fields ?? {}).sort();
    const schema = Object.keys(SECTION_SCHEMAS[type].shape).filter((k) => k !== "id" && k !== "hidden").sort();
    expect(fields).toEqual(schema);
  });
});
