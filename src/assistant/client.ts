import { profileIdentity, type Language } from "../content";
import { askResponseSchema } from "./contracts";
import type { AskResponse, ConversationTurn } from "./contracts";

const SAFETY_ID_KEY = `${profileIdentity.slug}-safety-id`;
type SessionStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};
let memorySafetyId: string | null = null;

function createSafetyId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function safetyId(): string {
  const storage = (globalThis as unknown as { sessionStorage?: SessionStorage }).sessionStorage;
  const existing = storage?.getItem(SAFETY_ID_KEY) ?? memorySafetyId;
  if (existing) return existing;
  const created = createSafetyId();
  storage?.setItem(SAFETY_ID_KEY, created);
  memorySafetyId = created;
  return created;
}

export async function askProfile(
  question: string,
  uiLanguage: Language,
  history: readonly ConversationTurn[],
  signal?: AbortSignal,
): Promise<AskResponse> {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      question,
      uiLanguage,
      history: history.slice(-6),
      safetyId: safetyId(),
    }),
    signal: signal ?? null,
  });
  if (!response.ok) throw new Error(`Profile assistant request failed with ${response.status}`);
  return askResponseSchema.parse(await response.json());
}
