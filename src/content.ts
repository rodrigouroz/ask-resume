import { profile } from "./profile";

export type { Language } from "./profile";

export const copy = profile.presentation.copy;
export const experiences = profile.presentation.experiences;
export const capabilities = profile.presentation.capabilities;
export const projects = profile.presentation.projects;
export const education = profile.presentation.education;
export const profileIdentity = profile.identity;
export const presentation = profile.presentation;
export const contact = profile.contact;
export const profileSections = {
  capabilities: capabilities.length > 0,
  projects: projects.length > 0,
  education: education.length > 0,
  mentoring: Boolean(presentation.mentoring),
  beyond: Boolean(presentation.beyond),
  about: education.length > 0 || Boolean(presentation.mentoring) || Boolean(presentation.beyond),
} as const;

export const externalLinks = {
  cv: `/${profile.pdf.visualFileName}`,
  atsResume: `/${profile.pdf.atsFileName}`,
  github: profile.contact.githubUrl,
  email: `mailto:${profile.contact.email}`,
} as const;

export function assetUrl(asset: string): string {
  return `/${asset}`;
}
