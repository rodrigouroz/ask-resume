import { useCallback, useEffect, useRef, useState } from "react";
import { trackClientAnalyticsEvent } from "./analytics";
import { useAssistantConversation } from "./assistant/useAssistantConversation";
import { profileIdentity, profileSections, type Language } from "./content";
import { ChatAssistant } from "./components/ChatAssistant";
import { AtsResume } from "./components/AtsResume";
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
  const stored = window.localStorage.getItem(`${profileIdentity.slug}-language`);
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

function InteractiveProfile() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const mobileLayout = useMobileLayout();
  const [chatOpen, setChatOpen] = useState(() => !isMobileLayout());
  const chatOpenTracked = useRef(false);
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
    window.localStorage.setItem(`${profileIdentity.slug}-language`, next);
  }, []);

  const openAssistant = useCallback(() => {
    setChatOpen(true);
    if (chatOpenTracked.current) return;

    chatOpenTracked.current = true;
    trackClientAnalyticsEvent("chat_opened");
  }, []);

  const ask = useCallback(
    (question: string) => {
      openAssistant();
      void conversation.ask(question);
    },
    [conversation, openAssistant],
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
          <Hero language={language} onOpenAssistant={openAssistant} />
          <ExperienceSection language={language} onAsk={ask} />
          {profileSections.capabilities && <CapabilitiesSection language={language} />}
          {profileSections.projects && <ProjectsSection language={language} onAsk={ask} />}
          {profileSections.about && <AboutSection language={language} />}
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
        onOpen={openAssistant}
        onClose={() => setChatOpen(false)}
        onAsk={ask}
        onNewChat={conversation.clear}
      />
    </>
  );
}

export function App() {
  const query = new URLSearchParams(window.location.search);
  if (query.get("resume") === "ats") {
    const language = query.get("language") === "es" ? "es" : "en";
    return <AtsRoute language={language} />;
  }

  return <InteractiveProfile />;
}

function AtsRoute({ language }: { language: Language }) {
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return <AtsResume language={language} />;
}
