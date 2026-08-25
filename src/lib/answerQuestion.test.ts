import { describe, expect, it } from "vitest";
import { answerQuestion } from "./answerQuestion";

describe("approved answer policy", () => {
  it("answers a supported professional question with an approved citation", () => {
    expect(answerQuestion("What has Rodrigo worked on at ClassDojo?", "en")).toEqual({
      answer:
        "He works as a Fullstack Software Engineer, contributing to the TypeScript web platform, product integrations, LLM features, and developer experience.",
      source: "ClassDojo · Experience",
      status: "answered",
    });
  });

  it("does not infer an unsupported answer and offers direct contact", () => {
    expect(answerQuestion("What salary is Rodrigo expecting?", "en")).toEqual({
      answer:
        "I don’t have an approved source for that. You can contact Rodrigo directly and ask him.",
      source: "No approved source",
      status: "unknown",
    });
  });

  it.each([
    {
      question: "How does Rodrigo approach zero-to-one products?",
      source: "Product engineering · Capabilities",
    },
    {
      question: "What is Rodrigo's experience leading teams?",
      source: "DLA TV & OpenEnglish · Experience",
    },
    {
      question: "What did Rodrigo build in Coro?",
      source: "Coro · Independent projects",
    },
  ])("answers '$question' from the matching approved source", ({ question, source }) => {
    const response = answerQuestion(question, "en");

    expect(response.status).toBe("answered");
    expect(response.source).toBe(source);
  });

  it("returns the unknown policy in Spanish", () => {
    expect(answerQuestion("¿Cuál es su expectativa salarial?", "es")).toEqual({
      answer:
        "No tengo una fuente aprobada para responder eso. Podés contactar a Rodrigo y preguntarle directamente.",
      source: "Sin fuente aprobada",
      status: "unknown",
    });
  });
});
