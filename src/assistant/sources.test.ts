import { describe, expect, it } from "vitest";
import { citationHref, sourceLabel } from "./sources";

describe("structured citation presentation", () => {
  it("navigates by stable section id independently of the localized label", () => {
    const citation = { sourceId: "coro-product", sectionId: "projects" } as const;

    expect(sourceLabel(citation.sourceId, "en")).toBe("Coro · Independent project");
    expect(sourceLabel(citation.sourceId, "es")).toBe("Coro · Proyecto independiente");
    expect(citationHref(citation)).toBe("#projects");
  });

  it("uses the section id even when the source id is unknown to presentation copy", () => {
    expect(citationHref({ sourceId: "future-approved-source", sectionId: "education" })).toBe(
      "#education",
    );
  });
});
