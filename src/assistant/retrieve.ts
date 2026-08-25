import { assistantCorpus } from "./corpus";
import type { CanonicalEvidence } from "./contracts";

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
  "un",
  "una",
  "what",
  "where",
  "who",
]);

const SPANISH_TO_CANONICAL: Readonly<Record<string, string>> = {
  construyo: "built",
  creo: "built",
  empresas: "companies",
  educacion: "education",
  enseno: "teaching",
  experiencia: "experience",
  estudio: "education",
  habilidades: "capabilities",
  intereses: "interests",
  idiomas: "language",
  ingeniero: "engineer",
  liderazgo: "leadership",
  lidero: "leadership",
  portafolio: "portfolio",
  profesor: "professor",
  proyecto: "project",
  proyectos: "project",
  tecnologias: "technology",
  tecnologia: "technology",
  trabajo: "worked",
  trabaja: "worked",
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
  const factTokens = new Set(tokenize(evidence.facts.map(({ text }) => text).join(" ")));

  return queryTokens.reduce((score, token) => {
    if (sourceTokens.has(token)) return score + 3;
    if (factTokens.has(token)) return score + 1;
    return score;
  }, 0);
}

export const retrieveEvidence: EvidenceRetriever = (question) => {
  const queryTokens = tokenize(question);
  const ranked = assistantCorpus
    .map((evidence) => ({ evidence, score: scoreEvidence(queryTokens, evidence) }))
    .filter(({ score }) => score >= 3)
    .sort((left, right) => right.score - left.score);

  if (ranked.length === 0) return [];
  const bestScore = ranked[0]?.score ?? 0;
  return ranked
    .filter(({ score }) => score === bestScore)
    .slice(0, 3)
    .map(({ evidence }) => evidence);
};
