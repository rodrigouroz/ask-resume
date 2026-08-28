import { describe, expect, it } from "vitest";
import { parseAskResponse } from "./responseValidation";

const validResponse = {
  status: "answered",
  language: "en",
  answer: "A grounded answer.",
  citations: [
    {
      sourceId: "career-overview",
      sectionId: "experience",
      label: "Professional experience overview",
    },
  ],
};

describe("assistant response validation", () => {
  it("accepts the public response contract", () => {
    expect(parseAskResponse(validResponse)).toEqual(validResponse);
  });

  it.each([
    null,
    { ...validResponse, status: "pending" },
    { ...validResponse, citations: [{ ...validResponse.citations[0], label: "" }] },
    { ...validResponse, citations: [{ ...validResponse.citations[0], sectionId: "private" }] },
  ])("rejects malformed responses", (value) => {
    expect(() => parseAskResponse(value)).toThrow("Invalid profile assistant response");
  });
});
