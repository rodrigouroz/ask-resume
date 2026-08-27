import rawEvidence from "../profile/evidence.json" with { type: "json" };
import rawProfile from "../profile/profile.json" with { type: "json" };
import rawTheme from "../profile/theme.json" with { type: "json" };
import { evidenceConfigSchema, profileSchema, themeSchema } from "./profileSchema.ts";
import type { EvidenceConfig, ProfileConfig, ThemeConfig } from "./profileSchema.ts";

export const profile: ProfileConfig = profileSchema.parse(rawProfile);
export const evidenceConfig: EvidenceConfig = evidenceConfigSchema.parse(rawEvidence);
export const theme: ThemeConfig = themeSchema.parse(rawTheme);

export type { Language } from "./profileSchema.ts";
