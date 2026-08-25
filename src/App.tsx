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

function getInitialLanguage(): Language {
  const stored = window.localStorage.getItem("ask-rodrigo-language");
  return stored === "es" ? "es" : "en";
}

function getInitialChatOpen(): boolean {
  return !window.matchMedia?.("(max-width: 860px)").matches;
}

export function App() {
  const [language, setLanguage] = useState<Language>(getInitialLanguage);
  const [chatOpen, setChatOpen] = useState(getInitialChatOpen);
  const conversation = useAssistantConversation(language);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

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
        Skip to content
      </a>
      <div id="top" className="page-shell">
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
