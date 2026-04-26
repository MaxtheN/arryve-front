/**
 * Vercel proxy: open a recorded Playwright session on the automation server.
 *
 * Browser POSTs `{ sessionId }` here when a demo conversation starts. We
 * HMAC-sign and forward to automation `/sessions/begin`, which spawns a
 * fresh Playwright context with `recordVideo` enabled and runs the HK
 * bootstrap on it. Subsequent /api/tool-invoke calls that include the same
 * sessionId will be pinned to that context, so every PMS action shows up in
 * the recording.
 *
 * The cold-start cost (HK bundle + property handshake) is on the order of
 * 10–30 s, so the browser should fire this in parallel with the Gemini
 * token mint to hide the latency.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'node:crypto';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} missing in Vercel env`);
  return v;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }
  try {
    const { sessionId } = (req.body ?? {}) as { sessionId?: string };
    if (!sessionId || !/^[0-9a-f-]{36}$/i.test(sessionId)) {
      res.status(400).json({ error: 'sessionId (uuid) required' });
      return;
    }
    const automationUrl = requireEnv('AUTOMATION_URL').replace(/\/+$/, '');
    const secret = requireEnv('AUTOMATION_TOOL_SECRET');
    const body = JSON.stringify({ sessionId });
    const ts = String(Date.now());
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${ts}.session-begin.${body}`)
      .digest('hex');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 60_000);
    let upstream: Response;
    try {
      upstream = await fetch(`${automationUrl}/sessions/begin`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-arryve-demo-ts': ts,
          'x-arryve-demo-signature': signature,
        },
        body,
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(t);
    }
    const text = await upstream.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    res.status(upstream.ok ? 200 : 502).json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
}
