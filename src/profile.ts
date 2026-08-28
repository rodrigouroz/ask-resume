import rawProfile from "../profile/profile.json" with { type: "json" };
import rawTheme from "../profile/theme.json" with { type: "json" };
import type { ProfileConfig, ThemeConfig } from "./profileSchema.ts";

// Vite and profile:check validate these files before building; keeping this module data-only
// prevents the browser bundle from carrying the validation library.
export const profile = rawProfile as ProfileConfig;
export const theme = rawTheme as ThemeConfig;

export type { Language } from "./profileSchema.ts";
