/**
 * Fire-and-forget demo audit client.
 *
 * Posts one structured event per conversation milestone to
 * /api/demo-event so we have a full server-side trace of every
 * demo interaction. Fails silently — we never want to break the
 * demo because logging is down.
 */

let sessionId: string | null = null;

export function newSessionId(): string {
  // crypto.randomUUID is in every modern browser; fall back just in case.
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  sessionId = uuid;
  return uuid;
}

export function getSessionId(): string | null {
  return sessionId;
}

export type DemoEventType =
  | 'session_start'
  | 'token_minted'
  | 'token_error'
  | 'ws_open'
  | 'ws_close'
  | 'first_audio'
  | 'transcript'
  | 'tool_call'
  | 'client_tool_call'
  | 'audio_level'
  | 'playback_queue_depth'
  | 'error'
  | 'ended';

export function logDemoEvent(
  type: DemoEventType,
  detail: Record<string, unknown> = {}
): void {
  const sid = sessionId;
  if (!sid) return;
  const payload = {
    sessionId: sid,
    type,
    ts: Date.now(),
    detail,
  };
  try {
    const blob = new Blob([JSON.stringify(payload)], {
      type: 'application/json',
    });
    // Prefer sendBeacon so the request survives a page unload (e.g. the
    // `ended` event). Fall back to fetch() keepalive for browsers that
    // don't implement sendBeacon for POST correctly.
    if (navigator.sendBeacon && navigator.sendBeacon('/api/demo-event', blob)) {
      return;
    }
    void fetch('/api/demo-event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* ignore */
  }
}
