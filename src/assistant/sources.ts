import type { Language } from "../content";
import type { Citation, SectionId } from "./contracts";

const labels: Readonly<Record<string, Record<Language, string>>> = {
  "assistant-identity": {
    en: "Ask Rodrigo · Assistant identity",
    es: "Ask Rodrigo · Identidad del asistente",
  },
  "career-overview": {
    en: "Professional experience overview",
    es: "Resumen de experiencia profesional",
  },
  "classdojo-current-role": {
    en: "ClassDojo · Experience",
    es: "ClassDojo · Experiencia",
  },
  "scvsoft-iot-tech-lead": { en: "SCVSoft · Experience", es: "SCVSoft · Experiencia" },
  "medallia-engineering-management": {
    en: "Medallia · Experience",
    es: "Medallia · Experiencia",
  },
  "futureadvisor-lead-engineer": {
    en: "FutureAdvisor · Experience",
    es: "FutureAdvisor · Experiencia",
  },
  "vsko-education-software": {
    en: "Lemonade / VSKO · Experience",
    es: "Lemonade / VSKO · Experiencia",
  },
  "dla-team-and-qa": { en: "DLA TV · Experience", es: "DLA TV · Experiencia" },
  "openenglish-engagement": {
    en: "OpenEnglish · Experience",
    es: "OpenEnglish · Experiencia",
  },
  "bumeran-search": { en: "Bumeran · Experience", es: "Bumeran · Experiencia" },
  "globant-functional-analysis": {
    en: "Globant · Experience",
    es: "Globant · Experiencia",
  },
  "mixplay-streaming": {
    en: "Claxson / Mixplay · Experience",
    es: "Claxson / Mixplay · Experiencia",
  },
  "product-engineering-capability": {
    en: "Product engineering · Capabilities",
    es: "Ingeniería de producto · Capacidades",
  },
  "leadership-capability": {
    en: "Leadership · Capabilities",
    es: "Liderazgo · Capacidades",
  },
  "technical-capabilities": {
    en: "Technical capabilities",
    es: "Capacidades técnicas",
  },
  "international-work-profile": {
    en: "International work profile",
    es: "Perfil de trabajo internacional",
  },
  "coro-product": {
    en: "Coro · Independent project",
    es: "Coro · Proyecto independiente",
  },
  "traza-product": {
    en: "Traza · Independent project",
    es: "Traza · Proyecto independiente",
  },
  "ballast-product": {
    en: "Ballast · Independent project",
    es: "Ballast · Proyecto independiente",
  },
  "jacara-product": {
    en: "Jacara · Independent project",
    es: "Jacara · Proyecto independiente",
  },
  "utn-education-and-teaching": {
    en: "UTN · Education and teaching",
    es: "UTN · Educación y docencia",
  },
  "itba-eoi-coursework": { en: "ITBA–EOI · Education", es: "ITBA–EOI · Educación" },
  "silver-mentoring": { en: "Silver.dev · Mentoring", es: "Silver.dev · Mentoría" },
  "historical-independent-projects": {
    en: "Earlier independent projects",
    es: "Proyectos independientes anteriores",
  },
  "personal-background": { en: "Beyond work", es: "Fuera del trabajo" },
};

const sectionHrefs: Record<SectionId, string> = {
  about: "#about",
  capabilities: "#capabilities",
  education: "#education",
  experience: "#experience",
  projects: "#projects",
};

export function sourceLabel(sourceId: string, language: Language): string {
  return labels[sourceId]?.[language] ?? sourceId;
}

export function citationHref({ sectionId }: Citation): string {
  return sectionHrefs[sectionId];
}
