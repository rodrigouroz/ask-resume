import rawProfile from "../profile/profile.json" with { type: "json" };
import rawTheme from "../profile/theme.json" with { type: "json" };
import type { ProfileConfig, ThemeConfig } from "./profileSchema.ts";

// Vite and profile:check validate these files before building; keeping this module data-only
// prevents the browser bundle from carrying the validation library. Mirror the schema defaults
// here so profiles that omit optional collections behave like their parsed representation.
const configuredProfile = rawProfile as unknown as ProfileConfig;
export const profile: ProfileConfig = {
  ...configuredProfile,
  presentation: {
    ...configuredProfile.presentation,
    capabilities: configuredProfile.presentation.capabilities ?? [],
    projects: configuredProfile.presentation.projects ?? [],
    education: configuredProfile.presentation.education ?? [],
  },
};
export const theme = rawTheme as unknown as ThemeConfig;

export type { Language } from "./profileSchema.ts";
