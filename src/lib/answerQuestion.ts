import type { Language } from "../content";
import { copy } from "../content";

export type AnswerStatus = "answered" | "unknown";

export type ChatAnswer = {
  answer: string;
  source: string;
  status: AnswerStatus;
};

export function answerQuestion(question: string, language: Language): ChatAnswer {
  const normalized = question.toLocaleLowerCase();

  if (normalized.includes("classdojo")) {
    return {
      answer: copy.chat.initialAnswer[language],
      source: "ClassDojo · Experience",
      status: "answered",
    };
  }

  if (
    normalized.includes("zero-to-one") ||
    normalized.includes("zero to one") ||
    normalized.includes("producto desde cero")
  ) {
    return {
      answer:
        language === "en"
          ? "He starts by mapping the real constraint, then de-risks it with a thin vertical slice and early instrumentation."
          : "Empieza por mapear la restricción real y luego reduce el riesgo con una primera vertical delgada e instrumentación temprana.",
      source: "Product engineering · Capabilities",
      status: "answered",
    };
  }

  if (normalized.includes("lead") || normalized.includes("team") || normalized.includes("equipo")) {
    return {
      answer:
        language === "en"
          ? "He has built and expanded engineering teams, created a QA function from scratch, hired and trained people, and managed an engagement of roughly 30 people."
          : "Armó y amplió equipos de ingeniería, creó QA desde cero, contrató y entrenó personas, y gestionó un proyecto de aproximadamente 30 personas.",
      source: "DLA TV & OpenEnglish · Experience",
      status: "answered",
    };
  }

  if (normalized.includes("coro")) {
    return {
      answer:
        language === "en"
          ? "Coro is a personal product exploring how global conversations can form naturally across languages, without rooms or follows. Rodrigo designed and built it end-to-end."
          : "Coro es un producto personal que explora cómo pueden formarse conversaciones globales entre idiomas, sin salas ni follows. Rodrigo lo diseñó y construyó de punta a punta.",
      source: "Coro · Independent projects",
      status: "answered",
    };
  }

  return {
    answer: copy.chat.unknown[language],
    source: language === "en" ? "No approved source" : "Sin fuente aprobada",
    status: "unknown",
  };
}
