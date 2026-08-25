import type { Language } from "../../content";
import { copy } from "../../content";
import { citationHref, sourceLabel } from "../../assistant/sources";
import type { AssistantTurn } from "../../assistant/useAssistantConversation";

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
