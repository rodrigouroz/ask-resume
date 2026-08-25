import { useEffect, useRef, useState } from "react";
import type { RefObject, SubmitEvent } from "react";
import type { Language } from "../content";
import { copy, externalLinks } from "../content";
import { citationHref, sourceLabel } from "../assistant/sources";
import type { AssistantTurn } from "../assistant/useAssistantConversation";
import { ArrowRightIcon, ChatIcon, CloseIcon, MailIcon } from "./Icons";

type ChatAssistantProps = {
  language: Language;
  modal: boolean;
  open: boolean;
  loading: boolean;
  pendingQuestion: string | null;
  turns: readonly AssistantTurn[];
  onOpen: () => void;
  onClose: () => void;
  onAsk: (question: string) => void;
  onNewChat: () => void;
};

type AssistantFocusOptions = Pick<ChatAssistantProps, "modal" | "onClose" | "open"> & {
  inputRef: RefObject<HTMLInputElement | null>;
  panelRef: RefObject<HTMLElement | null>;
};

type AssistantTranscriptProps = Pick<
  ChatAssistantProps,
  "language" | "onClose" | "pendingQuestion" | "turns"
>;

type AssistantFormProps = Pick<ChatAssistantProps, "language" | "loading" | "onAsk"> & {
  inputRef: RefObject<HTMLInputElement | null>;
};

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function useAssistantFocus({ inputRef, modal, onClose, open, panelRef }: AssistantFocusOptions) {
  const openerRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(open);
  const wasModal = useRef(modal);

  useEffect(() => {
    if (open && (!wasOpen.current || (modal && !wasModal.current))) {
      if (!wasOpen.current) {
        openerRef.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      inputRef.current?.focus();
    } else if (!open && wasOpen.current) {
      openerRef.current?.focus();
    }
    wasOpen.current = open;
    wasModal.current = modal;
  }, [inputRef, modal, open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      const panel = panelRef.current;
      if (!modal || event.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (
        event.shiftKey &&
        (document.activeElement === first || !panel.contains(document.activeElement))
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [modal, onClose, open, panelRef]);
}

function AssistantLaunchers({
  language,
  modal,
  onOpen,
  open,
}: Pick<ChatAssistantProps, "language" | "modal" | "onOpen" | "open">) {
  const text = (value: Record<Language, string>) => value[language];

  return (
    <>
      {!modal ? (
        <button className="desktop-chat-tab" type="button" onClick={onOpen} hidden={open}>
          <ChatIcon />
          {text(copy.chat.cta)}
        </button>
      ) : null}
      {modal ? (
        <button className="mobile-chat-bar" type="button" onClick={onOpen} hidden={open}>
          <ChatIcon />
          {text(copy.chat.cta)}
        </button>
      ) : null}
    </>
  );
}

function AssistantTranscript({
  language,
  onClose,
  pendingQuestion,
  turns,
}: AssistantTranscriptProps) {
  const text = (value: Record<Language, string>) => value[language];

  return (
    <div className="chat-transcript" aria-live="polite">
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
          <output className="chat-thinking" aria-label={text(copy.chat.thinking)}>
            <span className="chat-thinking-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span aria-hidden="true">{text(copy.chat.thinking)}</span>
          </output>
        </div>
      ) : null}
    </div>
  );
}

function AssistantForm({ inputRef, language, loading, onAsk }: AssistantFormProps) {
  const [question, setQuestion] = useState<string>("");
  const [questionError, setQuestionError] = useState<string | null>(null);
  const text = (value: Record<Language, string>) => value[language];

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) {
      setQuestionError(text(copy.chat.questionRequired));
      inputRef.current?.focus();
      return;
    }
    setQuestionError(null);
    onAsk(trimmed);
    setQuestion("");
  }

  return (
    <form className="chat-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="ask-rodrigo-input">
        {text(copy.chat.placeholder)}
      </label>
      <input
        ref={inputRef}
        id="ask-rodrigo-input"
        name="question"
        type="text"
        autoComplete="off"
        enterKeyHint="send"
        maxLength={500}
        value={question}
        onChange={(event) => {
          setQuestion(event.target.value);
          setQuestionError(null);
        }}
        placeholder={text(copy.chat.placeholder)}
        aria-invalid={questionError ? true : undefined}
        aria-describedby={questionError ? "ask-rodrigo-error" : undefined}
      />
      <button type="submit" aria-label={text(copy.chat.send)} disabled={loading}>
        <ArrowRightIcon />
      </button>
      {questionError ? (
        <p id="ask-rodrigo-error" className="chat-error" role="alert">
          {questionError}
        </p>
      ) : null}
    </form>
  );
}

export function ChatAssistant(props: ChatAssistantProps) {
  const {
    language,
    modal,
    open,
    loading,
    pendingQuestion,
    turns,
    onOpen,
    onClose,
    onAsk,
    onNewChat,
  } = props;
  const [formVersion, setFormVersion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const text = (value: Record<Language, string>) => value[language];

  useAssistantFocus({ inputRef, modal, onClose, open, panelRef });

  function startNewChat() {
    setFormVersion((version) => version + 1);
    onNewChat();
  }

  return (
    <>
      <AssistantLaunchers language={language} modal={modal} onOpen={onOpen} open={open} />

      {modal ? (
        <div
          className={`mobile-scrim ${open ? "is-open" : ""}`}
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      <aside
        ref={panelRef}
        className={`chat-panel ${open ? "is-open" : ""}`}
        role={modal ? "dialog" : "complementary"}
        aria-labelledby="ask-rodrigo-title"
        aria-modal={modal && open ? true : undefined}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="chat-handle" aria-hidden="true" />
        <div className="chat-header">
          <h2 id="ask-rodrigo-title">{text(copy.chat.title)}</h2>
          <div className="chat-header-actions">
            <button className="new-chat-button" type="button" onClick={startNewChat}>
              {text(copy.chat.newChat)}
            </button>
            <button type="button" aria-label={text(copy.chat.close)} onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </div>

        <AssistantTranscript
          language={language}
          onClose={onClose}
          pendingQuestion={pendingQuestion}
          turns={turns}
        />

        <AssistantForm
          key={formVersion}
          inputRef={inputRef}
          language={language}
          loading={loading}
          onAsk={onAsk}
        />

        <a className="contact-chat-link" href={externalLinks.email}>
          <MailIcon />
          {text(copy.chat.contact)}
        </a>
      </aside>
    </>
  );
}
