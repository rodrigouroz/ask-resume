import type { Language } from "../content";
import { evidenceConfig } from "../profile";
import type { Citation, SectionId } from "./contracts";

const labels = new Map(evidenceConfig.items.map(({ labels, sourceId }) => [sourceId, labels]));

const sectionHrefs: Record<SectionId, string> = {
  about: "#about",
  capabilities: "#capabilities",
  education: "#education",
  experience: "#experience",
  projects: "#projects",
};

export function sourceLabel(sourceId: string, language: Language): string {
  return labels.get(sourceId)?.[language] ?? sourceId;
}

export function citationHref({ sectionId }: Citation): string {
  return sectionHrefs[sectionId];
}
