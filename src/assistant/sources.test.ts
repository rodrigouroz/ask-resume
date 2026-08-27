import { describe, expect, it } from "vitest";
import { evidenceConfig } from "../profile";
import { citationHref, sourceLabel } from "./sources";

describe("structured citation presentation", () => {
  it("navigates by stable section id independently of the localized label", () => {
    const source = evidenceConfig.items[0];
    if (!source) throw new Error("Missing evidence source");
    const citation = { sourceId: source.sourceId, sectionId: source.sectionId };

    expect(sourceLabel(citation.sourceId, "en")).toBe(source.labels.en);
    expect(sourceLabel(citation.sourceId, "es")).toBe(source.labels.es);
    expect(citationHref(citation)).toBe(`#${source.sectionId}`);
  });

  it("uses the section id even when the source id is unknown to presentation copy", () => {
    expect(citationHref({ sourceId: "future-approved-source", sectionId: "education" })).toBe(
      "#education",
    );
  });
});
