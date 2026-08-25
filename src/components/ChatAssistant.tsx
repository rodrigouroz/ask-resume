import { useEffect, useRef, useState } from "react";
import type { SubmitEvent } from "react";
import type { Language } from "../content";
import { copy, externalLinks } from "../content";
import { citationHref, sourceLabel } from "../assistant/sources";
import type { AssistantTurn } from "../assistant/useAssistantConversation";
import { ArrowRightIcon, ChatIcon, CloseIcon, MailIcon } from "./Icons";

type ChatAssistantProps = {
  language: Language;
  open: boolean;
  loading: boolean;
  pendingQuestion: string | null;
  turns: readonly AssistantTurn[];
  onOpen: () => void;
  onClose: () => void;
  onAsk: (question: string) => void;
  onNewChat: () => void;
};

export function ChatAssistant({
  language,
  open,
  loading,
  pendingQuestion,
  turns,
  onOpen,
  onClose,
  onAsk,
  onNewChat,
}: ChatAssistantProps) {
  const [question, setQuestion] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpen = useRef(open);
  const text = (value: Record<Language, string>) => value[language];

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
          <div className="chat-header-actions">
            <button className="new-chat-button" type="button" onClick={onNewChat}>
              {text(copy.chat.newChat)}
            </button>
            <button type="button" aria-label="Close Ask Rodrigo" onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </div>

        <div className="chat-transcript" aria-live="polite">
          {turns.length === 0 && pendingQuestion === null ? (
            <div className="chat-turn">
              <p className="chat-question">{text(copy.chat.initialQuestion)}</p>
              <p className="chat-answer">{text(copy.chat.initialAnswer)}</p>
              <a className="chat-source" href="#experience" onClick={onClose}>
                [{sourceLabel("classdojo-current-role", language)}]
              </a>
            </div>
          ) : null}
          {turns.map(({ question: turnQuestion, response }) => (
            <div className="chat-turn" key={`${turnQuestion}:${response.answer}`}>
              <p className="chat-question">{turnQuestion}</p>
              <p className="chat-answer">{response.answer}</p>
              {response.citations.map((citation) => (
                <a
                  className="chat-source"
                  href={citationHref(citation)}
                  onClick={onClose}
                  key={`${citation.sourceId}:${citation.sectionId}`}
                >
                  [{sourceLabel(citation.sourceId, response.language)}]
                </a>
              ))}
              {response.status === "unknown" ? (
                <span className="chat-source chat-source-unknown">
                  [{text(copy.chat.unknownSource)}]
                </span>
              ) : null}
            </div>
          ))}
          {pendingQuestion ? (
            <div className="chat-turn">
              <p className="chat-question">{pendingQuestion}</p>
              <p className="chat-answer">{text(copy.chat.thinking)}</p>
            </div>
          ) : null}
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
          <button type="submit" aria-label="Send question" disabled={loading}>
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
