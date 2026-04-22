/**
 * Demo audit endpoint.
 *
 * The browser POSTs one event per session milestone: session_start,
 * token_minted, ws_open, transcript (user + model), first_audio,
 * error, ended. Every event ships a sessionId so Vercel's structured
 * logs can be filtered to a single conversation.
 *
 * This is fire-and-forget on the client — we never block the UI on
 * logging. The endpoint returns 204 no-content so the payload doesn't
 * need to round-trip a body.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

type EventBody = {
  sessionId?: string;
  type?: string;
  ts?: number;
  detail?: Record<string, unknown>;
};

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  const body = (req.body ?? {}) as EventBody;
  const sessionId = body.sessionId ?? 'no-session';
  const type = body.type ?? 'unknown';
  const detail = body.detail ?? {};
  // Single structured JSON line. Vercel's log panel + `vercel logs --json`
  // both parse this per line for filtering by sessionId or type.
  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      kind: 'demo_event',
      sessionId,
      type,
      ts: body.ts ?? Date.now(),
      ua: req.headers['user-agent'] ?? '',
      ip:
        (req.headers['x-forwarded-for'] as string | undefined) ??
        req.socket.remoteAddress ??
        '',
      detail,
    })
  );
  res.status(204).end();
}
