import type { Language } from "../../content";
import { contact, copy, externalLinks } from "../../content";
import { citationHref, sourceLabel } from "../../assistant/sources";
import type { AssistantTurn } from "../../assistant/useAssistantConversation";
import { MailIcon } from "../Icons";

function AnswerBody({ answer }: { answer: string }) {
  const [intro, ...items] = answer.split(/(?:^|\s+)[-•]\s+/).map((part) => part.trim());

  if (items.length < 2) {
    return <p>{answer}</p>;
  }

  return (
    <>
      <p>{intro}</p>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </>
  );
}

export function ChatTranscript({
  language,
  onClose,
  pendingQuestion,
  turns,
}: {
  language: Language;
  onClose: () => void;
  pendingQuestion: string | null;
  turns: readonly AssistantTurn[];
}) {
  const text = (value: Record<Language, string>) => value[language];
  const empty = turns.length === 0 && !pendingQuestion;

  return (
    <div className="chat-transcript" aria-live="polite">
      {empty ? (
        <div className="chat-empty">
          <span aria-hidden="true">↗</span>
          <h3>{text(copy.chat.emptyTitle)}</h3>
          <p>{text(copy.chat.emptyBody)}</p>
        </div>
      ) : null}
      {turns.map(({ question: turnQuestion, response }) => (
        <div className="chat-turn" key={`${turnQuestion}:${response.answer}`}>
          <p className="chat-question">{turnQuestion}</p>
          <div className="chat-answer">
            <AnswerBody answer={response.answer} />
          </div>
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
            <a className="chat-fallback-cta" href={externalLinks.email}>
              <MailIcon />
              {contact.email}
            </a>
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
