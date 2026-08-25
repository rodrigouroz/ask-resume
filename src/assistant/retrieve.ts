import { getCurrentAssistantCorpus } from "./corpus";
import type { CanonicalEvidence } from "./contracts";
import { todayIsoDate } from "./corpusValidation";

export type EvidenceRetriever = (
  question: string,
) => readonly CanonicalEvidence[] | Promise<readonly CanonicalEvidence[]>;

const STOP_WORDS = new Set([
  "a",
  "about",
  "at",
  "como",
  "cual",
  "cuales",
  "de",
  "did",
  "does",
  "en",
  "el",
  "ella",
  "es",
  "expectativa",
  "he",
  "had",
  "has",
  "have",
  "his",
  "in",
  "is",
  "la",
  "lo",
  "on",
  "para",
  "por",
  "que",
  "rodrigo",
  "salarial",
  "su",
  "sus",
  "the",
  "to",
  "un",
  "una",
  "what",
  "where",
  "who",
]);

const SPANISH_TO_CANONICAL: Readonly<Record<string, string>> = {
  construyo: "built",
  contratando: "hiring",
  creo: "built",
  decide: "decide",
  decisiones: "decisions",
  empresas: "companies",
  equipos: "team",
  educacion: "education",
  enseno: "teaching",
  experiencia: "experience",
  estudio: "education",
  formando: "training",
  habilidades: "capabilities",
  intereses: "interests",
  idiomas: "language",
  ingeniero: "engineer",
  liderazgo: "leadership",
  lidero: "leadership",
  incertidumbre: "uncertainty",
  portafolio: "portfolio",
  profesor: "professor",
  privacidad: "privacy",
  prueba: "validation",
  pruebas: "validation",
  proyecto: "project",
  proyectos: "project",
  tecnologias: "technology",
  tecnologia: "technology",
  valida: "validation",
  validacion: "validation",
  trabajo: "worked",
  trabaja: "worked",
  armando: "building",
};

function tokenize(value: string): string[] {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase()
      .match(/[a-z0-9]+/g)
      ?.map((token) => SPANISH_TO_CANONICAL[token] ?? token)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)) ?? []
  );
}

function scoreEvidence(queryTokens: readonly string[], evidence: CanonicalEvidence): number {
  const sourceTokens = new Set(tokenize(`${evidence.title} ${evidence.searchTerms.join(" ")}`));
  const factTokens = new Set(
    tokenize(evidence.facts.map(({ entities, text }) => `${text} ${entities.join(" ")}`).join(" ")),
  );

  return queryTokens.reduce((score, token) => {
    if (sourceTokens.has(token)) return score + 3;
    if (factTokens.has(token)) return score + 1;
    return score;
  }, 0);
}

export const retrieveEvidence: EvidenceRetriever = (question) => {
  const queryTokens = tokenize(question);
  const ranked = getCurrentAssistantCorpus(todayIsoDate())
    .map((evidence) => ({ evidence, score: scoreEvidence(queryTokens, evidence) }))
    .filter(({ score }) => score >= 3)
    .sort((left, right) => right.score - left.score);

  if (ranked.length === 0) return [];
  return ranked.slice(0, 3).map(({ evidence }) => evidence);
};
