/**
 * Per-session event ingestion proxy.
 *
 * Browser POSTs `{sessionId, kind, ...}` here on every demo lifecycle
 * moment. We dispatch to the appropriate dashboard-api endpoint:
 *   kind=session_start  → POST /sessions
 *   kind=event          → POST /sessions/:id/events
 *   kind=tool_call      → POST /sessions/:id/tool-call
 *
 * Always 204 — fire-and-forget, never block the demo on logging.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { signRequest } from './_dashboard-sign.js';

type Body =
  | { kind: 'session_start'; sessionId: string; ua?: string; variant?: string; language?: string; referrer_host?: string }
  | { kind: 'event'; sessionId: string; type: string; ts?: number; role?: string; text?: string; detail?: unknown }
  | { kind: 'tool_call'; sessionId: string; ts?: number; name: string; args?: unknown; ok: boolean; soft_error?: boolean; http_status?: number; result?: unknown; error?: string; ms?: number };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  try {
    const b = req.body as Body;
    if (!b || typeof b !== 'object' || !('sessionId' in b)) return res.status(400).end();
    const sid = b.sessionId;
    let pathSuffix: string;
    let payload: unknown;
    switch (b.kind) {
      case 'session_start':
        pathSuffix = '/sessions';
        payload = {
          id: sid,
          ua: b.ua,
          variant: b.variant,
          language: b.language,
          referrer_host: b.referrer_host,
        };
        break;
      case 'event':
        pathSuffix = `/sessions/${sid}/events`;
        payload = {
          ts: b.ts,
          type: b.type,
          role: b.role,
          text: b.text,
          detail: b.detail,
        };
        break;
      case 'tool_call':
        pathSuffix = `/sessions/${sid}/tool-call`;
        payload = {
          ts: b.ts,
          name: b.name,
          args: b.args,
          ok: b.ok,
          soft_error: b.soft_error,
          http_status: b.http_status,
          result: b.result,
          error: b.error,
          ms: b.ms,
        };
        break;
      default:
        return res.status(400).json({ error: 'unknown kind' });
    }
    const json = JSON.stringify(payload);
    const { ts, sig, url } = signRequest(pathSuffix, json);
    // Must await — Vercel kills the lambda the moment we return, so a
    // fire-and-forget fetch never reaches Caddy and the dashboard stays empty.
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 4000);
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-arryve-ts': ts,
          'x-arryve-signature': sig,
        },
        body: json,
        signal: ctrl.signal,
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        // eslint-disable-next-line no-console
        console.warn('[session-event] upstream', r.status, pathSuffix, txt.slice(0, 200));
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[session-event] fetch failed', pathSuffix, (err as Error).message);
    } finally {
      clearTimeout(t);
    }
    return res.status(204).end();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[session-event] handler error', (err as Error).message);
    return res.status(204).end();
  }
}
