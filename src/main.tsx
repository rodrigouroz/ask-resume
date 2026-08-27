import "@fontsource-variable/manrope";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { profile, theme } from "./profile";
import "./styles.css";

const themeVariables = {
  "--ink": theme.colors.ink,
  "--muted": theme.colors.muted,
  "--line": theme.colors.line,
  "--line-strong": theme.colors.lineStrong,
  "--blue": theme.colors.accent,
  "--blue-soft": theme.colors.accentSoft,
  "--white": theme.colors.surface,
  "--print-headline": JSON.stringify(profile.identity.headline),
  "--print-identity": JSON.stringify(`${profile.identity.name}  ·  ${profile.identity.headline}`),
};

for (const [property, value] of Object.entries(themeVariables)) {
  document.documentElement.style.setProperty(property, value);
}
document.documentElement.dataset.profileLength =
  profile.presentation.experiences.length <= 4 ? "short" : "long";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
