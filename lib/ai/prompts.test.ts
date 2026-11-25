import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/sections/catalog";
import { SECTION_TYPES } from "@/lib/sections/schemas";
import { REFERENCE_PAGE } from "@/lib/site/sample-pages";
import { BANNED_PHRASES, findBannedPhrases } from "./banned";
import { buildGenerateMessage, buildSystemPrompt } from "./prompts";

describe("buildSystemPrompt", () => {
  const prompt = buildSystemPrompt({ kind: "generate" });

  it("contains every banned phrase, in quotes", () => {
    for (const phrase of BANNED_PHRASES) expect(prompt).toContain(`"${phrase}"`);
  });

  it("has the catalog of all 10 sections", () => {
    expect(SECTION_TYPES).toHaveLength(10);
    const catalog = prompt.slice(prompt.indexOf("Sections you can use:"));
    for (const type of SECTION_TYPES) {
      expect(catalog).toContain(`- ${type} ("${CATALOG[type].label}"): ${CATALOG[type].aiHint}`);
    }
  });
});

describe("buildGenerateMessage", () => {
  it("fills in what wasn't given", () => {
    expect(buildGenerateMessage({ prompt: "Hi", useCase: "designer" })).toBe("Hi\n\nName: not given\nWhat they do: designer\nTone: not given");
  });
});

describe("findBannedPhrases", () => {
  it("finds nothing on the reference page and finds a phrase in any string", () => {
    expect(findBannedPhrases(REFERENCE_PAGE)).toEqual([]);
    const page = structuredClone(REFERENCE_PAGE);
    page.root.props.description = "A Passionate designer. Let’s work together!";
    expect(findBannedPhrases(page)).toEqual(["passionate", "let's work together!"]);
  });
});
