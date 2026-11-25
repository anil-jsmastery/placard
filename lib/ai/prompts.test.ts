import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/sections/catalog";
import { SECTION_TYPES } from "@/lib/sections/schemas";
import { REFERENCE_PAGE } from "@/lib/site/sample-pages";
import { BANNED_PHRASES, findBannedPhrases } from "./banned";
import { buildEditMessage, buildGenerateMessage, buildPrettifyMessage, buildPrettifyPrompt, buildSystemPrompt } from "./prompts";

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

describe("edit and Prettify prompts", () => {
  const page = REFERENCE_PAGE;
  const intro = page.content[0];
  const json = JSON.stringify({ root: page.root, content: page.content });

  it("an edit's system prompt is the build prompt and the editing block, without the page", () => {
    const prompt = buildSystemPrompt({ kind: "edit" });
    expect(prompt.startsWith(buildSystemPrompt({ kind: "generate" }))).toBe(true);
    expect(prompt).toContain("Editing an existing portfolio:\n- The current page is in the user's message as JSON.");
    expect(prompt).not.toContain("Current page:");
  });

  it("an edit's user message has the request, the selected section and the page", () => {
    expect(buildEditMessage({ prompt: "Make the headline shorter", page })).toBe(`Make the headline shorter\n\nCurrent page:\n${json}`);
    expect(buildEditMessage({ prompt: "Make the headline shorter", page, selection: { label: "Intro", section: intro } })).toBe(
      `Make the headline shorter\n\nThe user has selected the Intro section (id ${intro.props.id}). Apply the request to that section unless the user clearly means something else. The selected section: ${JSON.stringify(intro)}\nCurrent page:\n${json}`,
    );
  });

  it("Prettify gets what they do and the pairings in the system prompt, the page in the user message", () => {
    const prompt = buildPrettifyPrompt({ useCase: "designer" });
    expect(prompt).toContain("suit what they do (designer)");
    expect(prompt).toContain("- ocean with sans: research, product, science");
    expect(prompt.endsWith("The current page is in the user's message as JSON. Section ids are in props.id.")).toBe(true);
    expect(buildPrettifyMessage(page)).toBe(`Prettify this page.\n\nCurrent page:\n${json}`);
  });
});
