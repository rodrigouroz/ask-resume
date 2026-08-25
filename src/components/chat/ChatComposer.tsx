import { useState } from "react";
import type { RefObject, SubmitEvent } from "react";
import type { Language } from "../../content";
import { copy } from "../../content";
import { ArrowRightIcon } from "../Icons";

export function ChatComposer({
  inputRef,
  language,
  loading,
  onAsk,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  language: Language;
  loading: boolean;
  onAsk: (question: string) => void;
}) {
  const [question, setQuestion] = useState("");
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
