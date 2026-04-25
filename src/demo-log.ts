/**
 * Fire-and-forget demo audit client.
 *
 * Posts one structured event per conversation milestone to
 * /api/demo-event so we have a full server-side trace of every
 * demo interaction. Fails silently — we never want to break the
 * demo because logging is down.
 *
 * Also mirrors each event into Microsoft Clarity so session
 * recordings are filterable by demo lifecycle (started, first-audio,
 * tool-failed, ended) and we can build conversion funnels.
 */

import { clarityEvent, claritySet, clarityUpgrade } from './clarity';

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
      // fall through to clarity mirror
    } else {
      void fetch('/api/demo-event', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    /* ignore */
  }

  // Mirror to Clarity. Names are kept stable for funnel filters.
  try {
    switch (type) {
      case 'session_start':
        clarityEvent('demo_session_start');
        clarityUpgrade('demo_started');
        claritySet('arryve_demo_session', sid);
        break;
      case 'token_minted':
        clarityEvent('demo_token_minted');
        break;
      case 'token_error':
        clarityEvent('demo_token_error');
        claritySet('arryve_demo_outcome', 'token_error');
        break;
      case 'ws_open':
        clarityEvent('demo_ws_open');
        break;
      case 'first_audio': {
        const ms = (detail as { ms?: number }).ms;
        clarityEvent('demo_first_audio', ms != null ? { ttfb_ms: ms } : undefined);
        break;
      }
      case 'tool_call': {
        const d = detail as {
          name?: string;
          ok?: boolean;
          softError?: boolean;
          status?: number;
        };
        const name = d.name ?? 'unknown';
        if (d.ok === false) {
          clarityEvent('demo_tool_failed', {
            tool: name,
            status: d.status,
            soft: d.softError,
          });
          claritySet('arryve_tool_failure', name);
        } else {
          clarityEvent('demo_tool_ok', { tool: name });
        }
        break;
      }
      case 'transcript': {
        const role = (detail as { role?: string }).role;
        if (role === 'user') {
          clarityEvent('demo_user_turn');
        }
        break;
      }
      case 'ended': {
        const reason = (detail as { reason?: string }).reason ?? 'unknown';
        clarityEvent('demo_ended', { reason });
        claritySet('arryve_demo_outcome', reason);
        break;
      }
      case 'error':
        clarityEvent('demo_error');
        claritySet('arryve_demo_outcome', 'error');
        break;
      case 'ws_close':
        // ws_close is noisy; rely on `ended` for the outcome signal.
        break;
    }
  } catch {
    /* clarity offline */
  }
}

/**
 * Tag a high-intent CTA click. Use distinct names per CTA so the
 * Clarity Insights tab can show conversion funnels — landing →
 * book_demo_clicked, etc.
 */
export function logCtaClick(
  cta:
    | 'book_demo'
    | 'email_contact'
    | 'demo_start'
    | 'demo_stop'
    | 'pms_select'
    | 'faq_open'
    | 'mobile_menu_open',
  detail?: Record<string, string | number | boolean>
): void {
  try {
    clarityEvent(`cta_${cta}`, detail);
    if (cta === 'book_demo' || cta === 'email_contact') {
      clarityUpgrade('cta_high_intent');
      claritySet('arryve_high_intent', 'true');
    }
  } catch {
    /* ignore */
  }
}
