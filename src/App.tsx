import { useCallback, useState } from "react";
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
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

  const changeLanguage = useCallback((next: Language) => {
    setLanguage(next);
    window.localStorage.setItem("ask-rodrigo-language", next);
  }, []);

  const ask = useCallback((question: string) => {
    setActiveQuestion(question);
    setChatOpen(true);
  }, []);

  const download = useCallback(() => window.print(), []);

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div id="top" className="page-shell">
        <Header language={language} onLanguageChange={changeLanguage} onDownload={download} />
        <main id="main-content" className={chatOpen ? "chat-is-open" : ""}>
          <Hero language={language} onAsk={ask} onDownload={download} />
          <ExperienceSection language={language} onAsk={ask} />
          <CapabilitiesSection language={language} />
          <ProjectsSection language={language} onAsk={ask} />
          <AboutSection language={language} />
          <ContactSection language={language} onDownload={download} />
        </main>
      </div>
      <ChatAssistant
        language={language}
        open={chatOpen}
        activeQuestion={activeQuestion}
        onOpen={() => setChatOpen(true)}
        onClose={() => setChatOpen(false)}
        onAsk={ask}
      />
    </>
  );
}
