import { useCallback, useEffect, useState } from "react";
import { useAssistantConversation } from "./assistant/useAssistantConversation";
import type { Language } from "./content";
import { ChatAssistant } from "./components/ChatAssistant";
import { Header } from "./components/Header";
import {
  AboutSection,
  CapabilitiesSection,
  ContactSection,
  ExperienceSection,
  Hero,
  ProjectsSection,
} from "./components/ResumeSections";

const MOBILE_LAYOUT_QUERY = "(max-width: 860px)";

function getInitialLanguage(): Language {
  const stored = window.localStorage.getItem("ask-rodrigo-language");
  if (stored === "en" || stored === "es") return stored;

  const preferred = window.navigator.languages.find((locale) => /^(en|es)(-|$)/i.test(locale));
  return preferred?.toLowerCase().startsWith("es") ? "es" : "en";
}

function isMobileLayout(): boolean {
  return window.matchMedia?.(MOBILE_LAYOUT_QUERY).matches ?? false;
}

function useMobileLayout(): boolean {
  const [mobile, setMobile] = useState(isMobileLayout);

  useEffect(() => {
    if (!window.matchMedia) return;
    const query = window.matchMedia(MOBILE_LAYOUT_QUERY);
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return mobile;
}

export function App() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const mobileLayout = useMobileLayout();
  const [chatOpen, setChatOpen] = useState(() => !isMobileLayout());
  const conversation = useAssistantConversation(language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const modalOpen = mobileLayout && chatOpen;
    document.body.classList.toggle("assistant-modal-open", modalOpen);
    return () => document.body.classList.remove("assistant-modal-open");
  }, [chatOpen, mobileLayout]);

  const changeLanguage = useCallback((next: Language) => {
    setLanguage(next);
    window.localStorage.setItem("ask-rodrigo-language", next);
  }, []);

  const ask = useCallback(
    (question: string) => {
      setChatOpen(true);
      void conversation.ask(question);
    },
    [conversation],
  );

  return (
    <>
      <a className="skip-link" href="#main-content">
        {language === "en" ? "Skip to content" : "Saltar al contenido"}
      </a>
      <div
        id="top"
        className="page-shell"
        inert={mobileLayout && chatOpen}
        aria-hidden={mobileLayout && chatOpen ? true : undefined}
      >
        <Header language={language} onLanguageChange={changeLanguage} />
        <main id="main-content" className={chatOpen ? "chat-is-open" : ""}>
          <Hero language={language} onOpenAssistant={() => setChatOpen(true)} />
          <ExperienceSection language={language} onAsk={ask} />
          <CapabilitiesSection language={language} />
          <ProjectsSection language={language} onAsk={ask} />
          <AboutSection language={language} />
          <ContactSection language={language} />
        </main>
      </div>
      <ChatAssistant
        language={language}
        modal={mobileLayout}
        open={chatOpen}
        loading={conversation.loading}
        pendingQuestion={conversation.pendingQuestion}
        turns={conversation.turns}
        onOpen={() => setChatOpen(true)}
        onClose={() => setChatOpen(false)}
        onAsk={ask}
        onNewChat={conversation.clear}
      />
    </>
  );
}
