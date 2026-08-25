import { describe, expect, it } from "vitest";
import { resolveResponseLanguage } from "./language";

describe("question language resolution", () => {
  it("detects natural English and Spanish independently of UI language", () => {
    expect(resolveResponseLanguage("Tell me about Rodrigo's education", "es")).toBe("en");
    expect(resolveResponseLanguage("Contame sobre la experiencia de Rodrigo", "en")).toBe("es");
  });

  it("uses UI language for mixed and ambiguous questions", () => {
    expect(resolveResponseLanguage("What experiencia has Rodrigo?", "es")).toBe("es");
    expect(resolveResponseLanguage("ClassDojo?", "en")).toBe("en");
  });
});
