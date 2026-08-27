import type { Language } from "../content";

const englishSignals = new Set([
  "about",
  "can",
  "career",
  "background",
  "did",
  "education",
  "experience",
  "for",
  "his",
  "tell",
  "what",
  "where",
  "when",
  "why",
  "how",
  "does",
  "has",
  "have",
  "ignore",
  "invent",
  "management",
  "of",
  "profile",
  "role",
  "skills",
  "salary",
  "the",
  "worked",
  "work",
]);
const spanishSignals = new Set([
  "cual",
  "cuales",
  "carrera",
  "contame",
  "de",
  "del",
  "desobedece",
  "el",
  "que",
  "donde",
  "cuando",
  "como",
  "experiencia",
  "formacion",
  "hizo",
  "mostra",
  "mostrame",
  "muestra",
  "perfil",
  "por",
  "privados",
  "proyectos",
  "repositorios",
  "secretos",
  "sobre",
  "su",
  "sus",
  "trayectoria",
  "tiene",
  "trabaja",
  "trabajo",
  "trabajó",
]);

function tokens(value: string): string[] {
  return (
    value
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

export function resolveResponseLanguage(question: string, uiLanguage: Language): Language {
  const questionTokens = tokens(question);
  const englishScore = questionTokens.filter((token) => englishSignals.has(token)).length;
  const spanishScore = questionTokens.filter((token) => spanishSignals.has(token)).length;

  if (question.includes("¿") || question.includes("¡")) return "es";
  if (englishScore > 0 && spanishScore === 0) return "en";
  if (spanishScore > 0 && englishScore === 0) return "es";
  return uiLanguage;
}
