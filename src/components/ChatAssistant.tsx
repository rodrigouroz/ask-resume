import { useEffect, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import type { Language } from "../content";
import { copy, externalLinks } from "../content";
import { answerQuestion } from "../lib/answerQuestion";
import type { ChatAnswer } from "../lib/answerQuestion";
import { ArrowRightIcon, ChatIcon, CloseIcon, MailIcon } from "./Icons";

type ChatAssistantProps = {
  language: Language;
  open: boolean;
  activeQuestion: string | null;
  onOpen: () => void;
  onClose: () => void;
  onAsk: (question: string) => void;
};

export function ChatAssistant({
  language,
  open,
  activeQuestion,
  onOpen,
  onClose,
  onAsk,
}: ChatAssistantProps) {
  const [question, setQuestion] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(open);
  const text = (value: Record<Language, string>) => value[language];
  const currentQuestion = activeQuestion ?? text(copy.chat.initialQuestion);
  const response: ChatAnswer = answerQuestion(currentQuestion, language);

  useEffect(() => {
    if (open && !wasOpen.current) {
      inputRef.current?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    onAsk(trimmed);
    setQuestion("");
  }

  const sourceHref = response.source.includes("Independent projects")
    ? "#projects"
    : response.source.includes("Capabilities")
      ? "#capabilities"
      : "#experience";

  return (
    <>
      <button className="desktop-chat-tab" type="button" onClick={onOpen} hidden={open}>
        <ChatIcon />
        Ask Rodrigo
      </button>

      <button className="mobile-chat-bar" type="button" onClick={onOpen}>
        <ChatIcon />
        Ask Rodrigo
      </button>

      <div
        className={`mobile-scrim ${open ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`chat-panel ${open ? "is-open" : ""}`} aria-label="Ask Rodrigo">
        <div className="chat-handle" aria-hidden="true" />
        <div className="chat-header">
          <h2>Ask Rodrigo</h2>
          <button type="button" aria-label="Close Ask Rodrigo" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="chat-transcript" aria-live="polite">
          <p className="chat-question">{currentQuestion}</p>
          <p className="chat-answer">{response.answer}</p>
          {response.status === "answered" ? (
            <a className="chat-source" href={sourceHref} onClick={onClose}>
              [{response.source}]
            </a>
          ) : (
            <span className="chat-source chat-source-unknown">[{response.source}]</span>
          )}
        </div>

        <form className="chat-form" onSubmit={submit}>
          <label className="sr-only" htmlFor="ask-rodrigo-input">
            {text(copy.chat.placeholder)}
          </label>
          <input
            ref={inputRef}
            id="ask-rodrigo-input"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder={text(copy.chat.placeholder)}
          />
          <button type="submit" aria-label="Send question">
            <ArrowRightIcon />
          </button>
        </form>

        <a className="contact-chat-link" href={externalLinks.email}>
          <MailIcon />
          {text(copy.chat.contact)}
        </a>
      </aside>
    </>
  );
}
