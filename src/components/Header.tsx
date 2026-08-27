import { useEffect, useRef, useState } from "react";
import type { Language } from "../content";
import { contact, copy, externalLinks, profileIdentity, profileSections } from "../content";
import { MenuIcon } from "./Icons";

type HeaderProps = {
  language: Language;
  onLanguageChange: (language: Language) => void;
};

type LanguageSwitchProps = HeaderProps & {
  className: string;
  label: string;
  switchToEnglish: string;
  switchToSpanish: string;
};

function LanguageSwitch({
  className,
  label,
  language,
  onLanguageChange,
  switchToEnglish,
  switchToSpanish,
}: LanguageSwitchProps) {
  return (
    <fieldset className={className}>
      <legend className="sr-only">{label}</legend>
      <button
        type="button"
        aria-label={switchToEnglish}
        aria-pressed={language === "en"}
        onClick={() => onLanguageChange("en")}
      >
        EN
      </button>
      <span aria-hidden="true">·</span>
      <button
        type="button"
        aria-label={switchToSpanish}
        aria-pressed={language === "es"}
        onClick={() => onLanguageChange("es")}
      >
        ES
      </button>
    </fieldset>
  );
}

export function Header({ language, onLanguageChange }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const text = (value: Record<Language, string>) => value[language];

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  return (
    <header className="site-header">
      <a
        className="wordmark"
        href="#top"
        aria-label={
          language === "en" ? `${profileIdentity.name} — home` : `${profileIdentity.name} — inicio`
        }
      >
        {profileIdentity.name}
      </a>

      <div
        className="print-contact-details"
        aria-label={language === "en" ? "Contact details" : "Datos de contacto"}
      >
        <span>{text(copy.hero.location)}</span>
        <span aria-hidden="true">·</span>
        <a href={externalLinks.email}>{contact.email}</a>
        <span aria-hidden="true">·</span>
        <a href={externalLinks.github}>{contact.githubUrl.replace(/^https?:\/\//, "")}</a>
      </div>

      <LanguageSwitch
        className="mobile-language-switch"
        label={text(copy.nav.mobileLanguageLabel)}
        language={language}
        onLanguageChange={onLanguageChange}
        switchToEnglish={text(copy.nav.switchToEnglish)}
        switchToSpanish={text(copy.nav.switchToSpanish)}
      />

      <button
        ref={menuButtonRef}
        className="mobile-menu-button"
        type="button"
        aria-label={text(menuOpen ? copy.nav.closeMenu : copy.nav.openMenu)}
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <MenuIcon />
      </button>

      <div id="mobile-navigation" className={`header-actions ${menuOpen ? "is-open" : ""}`}>
        <nav aria-label={text(copy.nav.mainLabel)}>
          <a href="#experience" onClick={() => setMenuOpen(false)}>
            {text(copy.nav.experience)}
          </a>
          {profileSections.capabilities && (
            <a href="#capabilities" onClick={() => setMenuOpen(false)}>
              {text(copy.nav.capabilities)}
            </a>
          )}
          {profileSections.projects && (
            <a href="#projects" onClick={() => setMenuOpen(false)}>
              {text(copy.nav.projects)}
            </a>
          )}
          {profileSections.about && (
            <a href="#about" onClick={() => setMenuOpen(false)}>
              {text(copy.nav.about)}
            </a>
          )}
        </nav>

        <LanguageSwitch
          className="language-switch"
          label={text(copy.nav.languageLabel)}
          language={language}
          onLanguageChange={onLanguageChange}
          switchToEnglish={text(copy.nav.switchToEnglish)}
          switchToSpanish={text(copy.nav.switchToSpanish)}
        />

        <a className="text-link download-link" href={externalLinks.cv} download>
          {text(copy.download)}
        </a>
      </div>
    </header>
  );
}
