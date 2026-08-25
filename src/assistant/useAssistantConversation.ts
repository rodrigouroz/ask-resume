import { useCallback, useRef, useState } from "react";
import type { Language } from "../content";
import { copy } from "../content";
import { askRodrigo } from "./client";
import type { AskResponse, ConversationTurn } from "./contracts";

export type AssistantTurn = ConversationTurn & { response: AskResponse };

export function useAssistantConversation(language: Language) {
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || pendingQuestion !== null) return;
      const history = turns.slice(-6).map(({ question: previousQuestion, answer }) => ({
        question: previousQuestion,
        answer,
      }));
      const controller = new AbortController();
      controllerRef.current = controller;
      setPendingQuestion(trimmed);

      let response: AskResponse;
      try {
        response = await askRodrigo(trimmed, language, history, controller.signal);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        response = {
          status: "unknown",
          language,
          answer: copy.chat.unknown[language],
          citations: [],
        };
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          setPendingQuestion(null);
        }
      }

      setTurns((current) => [
        ...current.slice(-5),
        { question: trimmed, answer: response.answer, response },
      ]);
    },
    [language, pendingQuestion, turns],
  );

  const clear = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPendingQuestion(null);
    setTurns([]);
  }, []);

  return { ask, clear, loading: pendingQuestion !== null, pendingQuestion, turns };
}
