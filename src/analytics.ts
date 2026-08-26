export type ClientAnalyticsEvent = "chat_opened";

export function trackClientAnalyticsEvent(event: ClientAnalyticsEvent): void {
  void fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event }),
    keepalive: true,
  }).catch(() => undefined);
}
