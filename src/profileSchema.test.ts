import { describe, expect, it } from "vitest";
import { evidenceConfigSchema } from "./profileSchema";

describe("evidence evaluation contract", () => {
  it("retains conversation history and required answer content", () => {
    const history = [{ answer: "Rodrigo works at ClassDojo.", question: "Where does he work?" }];
    const parsed = evidenceConfigSchema.parse({
      schemaVersion: 1,
      items: [
        {
          facts: [
            {
              factId: "current-role-fact",
              reviewedAt: "2026-08-27",
              text: "Rodrigo works at ClassDojo.",
            },
          ],
          labels: { en: "Current role", es: "Rol actual" },
          sectionId: "experience",
          sourceId: "current-role",
          title: "Current role",
          visibility: "public",
        },
      ],
      evals: [
        {
          allowedSourceIds: ["current-role"],
          attempts: 3,
          history,
          id: "follow-up-current-role",
          language: "en",
          question: "Since when?",
          required: ["since 2021"],
          sourceIds: ["current-role"],
          statuses: ["answered"],
          uiLanguage: "en",
        },
      ],
    });

    expect(parsed.evals[0]).toMatchObject({
      allowedSourceIds: ["current-role"],
      attempts: 3,
      history,
      required: ["since 2021"],
    });
  });
});
