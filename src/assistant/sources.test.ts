import { describe, expect, it } from "vitest";
import { evidenceConfig } from "../evidence";
import { citationHref } from "./sources";

describe("structured citation presentation", () => {
  it("navigates by stable section id independently of the localized label", () => {
    const source = evidenceConfig.items[0];
    if (!source) throw new Error("Missing evidence source");
    const citation = {
      sourceId: source.sourceId,
      sectionId: source.sectionId,
      label: source.labels.en,
    };

    expect(citationHref(citation)).toBe(`#${source.sectionId}`);
  });

  it("uses the section id even when the source id is unknown to presentation copy", () => {
    expect(
      citationHref({
        sourceId: "future-approved-source",
        sectionId: "education",
        label: "Future source",
      }),
    ).toBe("#education");
  });
});
