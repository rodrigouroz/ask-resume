import { useState } from "react";
import type { Language } from "../content";
import { copy, externalLinks } from "../content";
import { MenuIcon } from "./Icons";

type HeaderProps = {
  language: Language;
  onLanguageChange: (language: Language) => void;
};

export function Header({ language, onLanguageChange }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const text = (value: Record<Language, string>) => value[language];

  return (
    <header className="site-header">
      <a className="wordmark" href="#top" aria-label="Rodrigo Uroz — home">
        Rodrigo Uroz
      </a>

      <div className="mobile-language-switch" aria-label="Mobile language">
        <button
          type="button"
          aria-label="Switch language to English"
          aria-pressed={language === "en"}
          onClick={() => onLanguageChange("en")}
        >
          EN
        </button>
        <span aria-hidden="true">·</span>
        <button
          type="button"
          aria-label="Switch language to Spanish"
          aria-pressed={language === "es"}
          onClick={() => onLanguageChange("es")}
        >
          ES
        </button>
      </div>

      <button
        className="mobile-menu-button"
        type="button"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MenuIcon />
      </button>

      <div className={`header-actions ${menuOpen ? "is-open" : ""}`}>
        <nav aria-label="Main navigation">
          <a href="#experience" onClick={() => setMenuOpen(false)}>
            {text(copy.nav.experience)}
          </a>
          <a href="#capabilities" onClick={() => setMenuOpen(false)}>
            {text(copy.nav.capabilities)}
          </a>
          <a href="#projects" onClick={() => setMenuOpen(false)}>
            {text(copy.nav.projects)}
          </a>
          <a href="#about" onClick={() => setMenuOpen(false)}>
            {text(copy.nav.about)}
          </a>
        </nav>

        <div className="language-switch" aria-label="Language">
          <button
            type="button"
            aria-pressed={language === "en"}
            onClick={() => onLanguageChange("en")}
          >
            EN
          </button>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            aria-pressed={language === "es"}
            onClick={() => onLanguageChange("es")}
          >
            ES
          </button>
        </div>

        <a className="text-link download-link" href={externalLinks.cv} download>
          {text(copy.download)}
        </a>
      </div>
    </header>
  );
}
