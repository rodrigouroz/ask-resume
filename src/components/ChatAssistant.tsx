import { useRef, useState } from "react";
import type { Language } from "../content";
import { copy, externalLinks } from "../content";
import type { AssistantTurn } from "../assistant/useAssistantConversation";
import { ChatIcon, CloseIcon, MailIcon } from "./Icons";
import { ChatComposer } from "./chat/ChatComposer";
import { ChatTranscript } from "./chat/ChatTranscript";
import { useChatFocus } from "./chat/useChatFocus";

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

  useChatFocus({ inputRef, modal, onClose, open, panelRef });

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
        aria-labelledby="assistant-title"
        aria-modal={modal && open ? true : undefined}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="chat-handle" aria-hidden="true" />
        <div className="chat-header">
          <h2 id="assistant-title">{text(copy.chat.title)}</h2>
          <div className="chat-header-actions">
            <button className="new-chat-button" type="button" onClick={startNewChat}>
              {text(copy.chat.newChat)}
            </button>
            <button type="button" aria-label={text(copy.chat.close)} onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
        </div>

        <ChatTranscript
          language={language}
          onClose={onClose}
          pendingQuestion={pendingQuestion}
          turns={turns}
        />

        <ChatComposer
          key={formVersion}
          inputRef={inputRef}
          language={language}
          loading={loading}
          onAsk={onAsk}
        />

        {turns.length === 0 && !pendingQuestion ? (
          <a className="contact-chat-link" href={externalLinks.email}>
            <MailIcon />
            {text(copy.chat.contact)}
          </a>
        ) : null}
      </aside>
    </>
  );
}
