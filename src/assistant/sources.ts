import type { Citation, SectionId } from "./contracts";

const sectionHrefs: Record<SectionId, string> = {
  about: "#about",
  capabilities: "#capabilities",
  education: "#education",
  experience: "#experience",
  projects: "#projects",
};

export function citationHref({ sectionId }: Citation): string {
  return sectionHrefs[sectionId];
}
